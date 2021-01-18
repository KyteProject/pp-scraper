require( 'dotenv' ).config();
import puppeteer from 'puppeteer';

( async() => {
  const browser = await puppeteer.launch( {
      headless: false,
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
    await popup.waitForSelector( '#Header_RadTabStrip1_ctl02' );
    await popup.click( '#Header_RadTabStrip1_ctl02' );
    await popup.waitForSelector( '#Header_ctl06_m0' );
    await popup.click( '#Header_ctl06_m0' );
    await popup.waitFor( 3000 );
    await popup.waitForSelector( '#Header_ctl06_m0_m1' );
    await popup.click( '#Header_ctl06_m0_m1' );

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
    const nums = [
      [ '12197' ],
      [ '12190' ],
      [ '12184' ],
      [ '12203' ],
      [ '12194' ],
      [ '12178' ],
      [ '12073' ],
      [ '12146' ],
      [ '12200' ],
      [ '12159' ],
      [ '12044' ],
      [ '12171' ],
      [ '12196' ],
      [ '12202' ],
      [ '12056' ],
      [ '12198' ],
      [ '12144' ],
      [ '12199' ],
      [ '12119' ],
      [ '12106' ],
      [ '12195' ],
      [ '12096' ],
      [ '12145' ],
      [ '12189' ],
      [ '12188' ],
      [ '12149' ],
      [ '12193' ],
      [ '12152' ],
      [ '12205' ],
      [ '12102' ],
      [ '12086' ],
      [ '12155' ],
      [ '12191' ],
      [ '12192' ],
      [ '12052' ],
      [ '12201' ],
      [ '12089' ],
      [ '12128' ],
      [ '12168' ],
      [ '12204' ],
      [ '12173' ]
    ];
    

    await page.waitFor( 2000 );
    await page.waitForSelector( '#ddlDataGridSearch' );
    await page.select( '#ddlDataGridSearch', 'EmployeeExternalID' );
    await page.waitFor( 500 );

    for ( let x = 0; x < nums.length; x++ ) {
      const id = nums[ x ][ 0 ];
    
      // Search for record
      await page.waitFor( 1000 );
      await page.waitForSelector( '#txtDataGridSearch' );
      const input = await page.$( '#txtDataGridSearch' );

      await input.click( { clickCount: 3 } );
      await input.type( id );

      await page.waitFor( 500 );
      await page.click( '#btnDataGridSearch' );
      await page.waitFor( 1000 );

      // Enter record
      await page.waitForSelector( '#dgrdDataGrid_ctl03_btnDataGridSelect' );
      await page.click( '#dgrdDataGrid_ctl03_btnDataGridSelect' );
      await page.waitForSelector( '#RadTabStrip1_ctl18' );
      await page.click( '#RadTabStrip1_ctl18' );
      await page.waitFor( 500 );

      // Handle rostered
      const els = await page.$$( 'select' );

      let el;

      for ( let i = 0; i < els.length; i++ ) {
        let valueHandle = await els[ i ].getProperty( 'name' ),
          linkText = await valueHandle.jsonValue();

        if ( linkText === 'pvRostered?_CustomFields_UserControl$CUST_EmployeeCustom_Rostered' ) {
          console.log( `Found: ${id}` );
          el = els[ i ];
        }
      }

      await el.select( 'Rostered' );
      await page.waitFor( 2000 );
      await el.select( 'Rostered' );
      await page.waitFor( 2000 );

      // Save record and return
      await page.click( '#btnSave' );
      console.log( '-> Save clicked' );
      await page.waitFor( 10000 );

      await page.click( '#btnBack' );
      console.log( '-> Back clicked' );
      await page.waitFor( 7000 );

      console.log( `Updated: ${id}` );
    }
  } catch ( err ) {
    console.log( err );
  }
} )();
