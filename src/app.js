require( 'dotenv' ).config();
import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';

( async() => {
  const csvWriter = createObjectCsvWriter( {
      path: 'out.csv',
      header: [
        { id: 'branch', title: 'Branch' },
        { id: 'team', title: 'Service/Team' },
        { id: 'generated', title: 'Generated' },
        { id: 'allocated', title: 'Allocated' },
        { id: 'unallocated', title: 'Unallocated' }
      ]
    } ),
    data = [],
    date = '27/05/2019',
    branchExclusion = [ 'All', 'Cornerstone Wide', 'Operational Support', 'Training Academy' ],
    teamExclusion = require( './excludedTeams.js' ),
    allowedShiftTypes = [ 'Support', 'Support Share-Lead' ],
    browser = await puppeteer.launch( {
      headless: true,
      ignoreHTTPSErrors: true,
      args: [ `--window-size=${1024},${768}` ]
    } ),
    page = await browser.newPage();

  console.time( 'Completed in' );

  try {
    await page.setViewport( { width: 1024, height: 738 } );
    await page.goto( 'https://www.peopleplanner.biz/Security/Login.aspx' );
    await page.type( '#txtAccountID', process.env.DB );
    await page.click( '#btnLogin' );
    await page.waitFor( 750 );
    await page.click( '#btnLogin' );
  } catch ( err ) {
    console.log( err );
  }

  // Handle popup window
  try {
    const [ popup ] = await Promise.all( [
      new Promise( ( resolve ) => page.once( 'popup', resolve ) ),
      console.log( 'Focused popup.' )
    ] );

    await popup.setViewport( { width: 1024, height: 738 } );
    await popup.waitForSelector( '.LoginSSMButton' );
    await popup.click( '.LoginSSMButton' );
    await popup.waitForSelector( '#txtUserCode' );
    await popup.type( '#txtUserCode', process.env.USER );
    await popup.type( '#txtUserPassword', process.env.PASSWORD );
    await popup.click( '#btnLogin' );
    await popup.waitForNavigation( { waitUntil: 'networkidle0' } );
    await popup.waitForSelector( '#Header_RadTabStrip1_ctl04' );
    await popup.click( '#Header_RadTabStrip1_ctl04' );
    await popup.waitForSelector( '#ifrmDetail' );

    // Enter iframe
    const frameUrl = await popup.evaluate( () => {
      const url = document.querySelector( '#ifrmDetail' );

      return url.src;
    } );

    await popup.close();
    await page.goto( frameUrl );

    console.log( 'Focused inner iframe' );
  } catch ( err ) {
    console.log( err );
  }

  // Main logic
  try {
    const branches = await page.evaluate( ( branchExclusion ) => {
      const options = [];

      document.querySelectorAll( '#ddlBranch option' ).forEach( ( opt ) => {
        if ( !branchExclusion.includes( opt.textContent ) ) {
          options.push( { name: opt.textContent, value: opt.value } );
        }
      } );

      return options;
    }, branchExclusion );

    await page.type( '#txtFromDate', date );
    await page.select( '#ddlStatus', '1' );
    await page.waitForSelector( '#ProgressIndicator', { visible: true } );
    await page.waitForSelector( '#ProgressIndicator', { hidden: true } );
    console.log( 'Date and status updated.' );

    // Loop through branches
    for ( let i = 0; i < branches.length; i++ ) {
      const branch = branches[ i ];

      await page.waitForSelector( '#ddlBranch' );
      await page.select( '#ddlBranch', branch.value );
      await page.waitFor( 500 );
      await page.select( '#ddlBranch', branch.value );
      await page.waitFor( 3000 );
      await page.waitForSelector( '#ProgressIndicator', { hidden: true } );
      console.log( `Switched to branch: ${branch.name} (${i + 1} of ${branches.length})` );

      const teams = await page.evaluate( async() => {
        const options = [];

        await document
          .querySelectorAll( '#ddlBranchArea option' )
          .forEach( ( opt ) => options.push( { name: opt.textContent, value: opt.value } ) );

        return options.filter( ( t ) => t.name !== 'All' );
      } );

      // loop through teams
      for ( let x = 0; x < teams.length; x++ ) {
        const team = teams[ x ],
          entry = {
            branch: branch.name,
            team: team.name,
            generated: 'yes',
            allocated: 0,
            unallocated: 0
          };

        await page.waitForSelector( '#ddlBranchArea' );
        await page.select( '#ddlBranchArea', team.value );
        await page.waitFor( 500 );
        await page.select( '#ddlBranchArea', team.value );
        await page.waitFor( 500 );
        await page.select( '#ddlStatus', '2' );
        await page.waitFor( 500 );
        await page.select( '#ddlStatus', '1' );
        await page.waitFor( 5000 );
        await page.waitForSelector( '#ProgressIndicator', { hidden: true } );
        await page.waitForSelector( '#PlanningServiceTypeChartContainer' );
        console.log( `Switched to team: ${team.name} (${x + 1} of ${teams.length})` );

        const index = await page.evaluate( () => {
            return parseInt(
              document
                .querySelector( '#PlanningServiceTypeChartContainer' )
                .getAttribute( 'data-highcharts-chart' )
            );
          } ),
          aHandle = await page.evaluateHandle( ( index ) => {
            return window.Highcharts.charts[ index ].series[ 0 ].data;
          }, index ),
          props = await aHandle.getProperties();

        // loop though chart props
        for ( let y = 0; y < props.size; y++ ) {
          if ( teamExclusion.list.includes( team.name ) ) {
            entry.generated = 'Exempt';
            break;
          }

          const props = await aHandle.getProperty( y.toString() );

          let type = await props.getProperty( 'category' ),
            total = await props.getProperty( 'total' ),
            percentage = await props.getProperty( 'percentage' );

          type = await type.jsonValue();
          total = await total.jsonValue();
          percentage = await percentage.jsonValue();

          if ( type === 0 ) {
            entry.generated = 'no';
            break;
          }

          if ( allowedShiftTypes.includes( type ) ) {
            const unallocated = percentage ? Math.round( total * percentage / 100 ) : 0,
              allocated = percentage !== 100 ? total - unallocated : 0;

            entry.unallocated += unallocated;
            entry.allocated += allocated;
          }
        }

        await page.waitFor( 1000 );
        await data.push( entry );
        console.log( 'Pushing results: ', entry );
      }
    }
  } catch ( err ) {
    console.log( err );
  }

  // Write Data
  try {
    console.log( 'Writing csv file: ./out.csv' );

    csvWriter.writeRecords( data ).then( () => {
      console.timeEnd( 'Completed in' );
    } );
  } catch ( err ) {
    console.log( err );
  }
} )();
