/* eslint-disable no-shadow */
/* eslint-disable no-loop-func */
require( 'dotenv' ).config();
import puppeteer from 'puppeteer';

( async() => {
  const branchExclusion = [ 'All', 'Cornerstone Wide', 'Operational Support', 'Training Academy' ],
    teamExclusion = [ 'All' ],
    allowedShiftTypes = [ 'Support', 'Support Share-Lead' ],
    date = '08/04/2019',
    data = [],
    browser = await puppeteer.launch( { headless: false } ),
    page = await browser.newPage();

  await page.setViewport( { width: 1024, height: 738 } );
  await page.goto( 'https://www.peopleplanner.biz/Security/Login.aspx' );
  await page.type( '#txtAccountID', process.env.DB );
  await page.click( '#btnLogin' );
  await page.waitFor( 1000 );
  await page.click( '#btnLogin' );

  // Handle popup window
  const [ popup ] = await Promise.all( [
    new Promise( ( resolve ) => page.once( 'popup', resolve ) ),
    console.log( 'popupwindow' )
  ] );

  await popup.setViewport( { width: 1024, height: 738 } );
  await popup.waitForSelector( '.LoginSSMButton' );
  await popup.click( '.LoginSSMButton' );
  await popup.waitForSelector( '#txtUserCode' );
  await popup.type( '#txtUserCode', process.env.USER );
  await popup.type( '#txtUserPassword', process.env.PASSWORD );
  await popup.click( '#btnLogin' );
  await popup.waitForSelector( '#Header_RadTabStrip1_ctl04' );
  await popup.click( '#Header_RadTabStrip1_ctl04' );
  await popup.waitForSelector( '#ifrmDetail' );

  // Enter iframe
  const frameUrl = await popup.evaluate( () => {
    const url = document.querySelector( '#ifrmDetail' );

    return url.src;
  } );

  await popup.goto( frameUrl );

  // Main logic
  const branches = await popup.evaluate( ( branchExclusion ) => {
    const options = [];

    document.querySelectorAll( '#ddlBranch option' ).forEach( ( opt ) => {
      if ( !branchExclusion.includes( opt.textContent ) ) {
        options.push( { name: opt.textContent, value: opt.value } );
      }
    } );

    return options;
  }, branchExclusion );

  await popup.type( '#txtFromDate', date );
  await popup.select( '#ddlStatus', '1' );

  for ( let i = 0; i < branches.length; i++ ) {
    await popup.select( '#ddlBranch', branches[ i ].value );
    await popup.waitFor( 1000 );
    await popup.select( '#ddlBranch', branches[ i ].value );
    await popup.waitFor( 3000 );

    const teams = await popup.evaluate( ( teamExclusion ) => {
      const options = [];

      document.querySelectorAll( '#ddlBranchArea option' ).forEach( ( opt ) => {
        if ( !teamExclusion.includes( opt.textContent ) ) {
          options.push( { name: opt.textContent, value: opt.value } );
        }
      } );

      return options;
    }, teamExclusion );

    for ( let x = 0; x < teams.length; x++ ) {
      await popup.select( '#ddlBranchArea', teams[ x ].value );
      await popup.waitFor( 1500 );
      await popup.waitForSelector( '#PlanningServiceTypeChartContainer' );
      const aHandle = await popup.evaluateHandle( () => window.Highcharts.charts[ 1 ].series[ 0 ].data ),
        handleProps = await aHandle.getProperties(),
        propsSize = handleProps.size;

      for ( let y = 0; y < propsSize; y++ ) {
        const props = await aHandle.getProperty( y.toString() );

        let type = await props.getProperty( 'category' ),
          total = await props.getProperty( 'total' ),
          percentage = await props.getProperty( 'percentage' );

        type = await type.jsonValue();
        total = await total.jsonValue();
        percentage = await percentage.jsonValue();

        const unallocated = Math.round( total * percentage / 100 ),
          allocated = total - unallocated;

        console.log( props );
      }
    }
  }

  // const jsHandle = await popup.evaluateHandle( () => {
  //     const chart = window.Highcharts.charts[ 1 ].series[ 0 ].data;

  //     console.log( chart );
  //     return chart;
  //   } ),
  //   chartData = await popup.evaluate( async( jsHandle ) => {
  //     jsHandle.forEach.forEach( ( serviceType ) => {
  //       console.log( `${serviceType.category}: ${serviceType.total} ${serviceType.percentage}%` );

  //       // if ( allowedShiftTypes.includes( serviceType.category ) ) {
  //       //   const shiftData = {
  //       //     type: serviceType.category,
  //       //     unallocated: Math.round( serviceType.total * serviceType.percentage / 100 )
  //       //   };

  //       //   shiftData.allocated = serviceType.total - shiftData.unallocated;
  //       // }
  //     } );
  //   }, jsHandle );
} )();
