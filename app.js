require( 'dotenv' ).config();
import puppeteer from 'puppeteer';

( async() => {
  const branchExclusion = [ 'All', 'Cornerstone Wide', 'Operational Support', 'Training Academy' ],
    browser = await puppeteer.launch( { headless: false, slowMo: 25 } ),
    page = await browser.newPage();

  await page.setViewport( { width: 1024, height: 738 } );
  await page.goto( 'https://www.peopleplanner.biz/Security/Login.aspx' );
  await page.type( '#txtAccountID', process.env.DB );
  await page.click( '#btnLogin' );
  await page.waitFor( 1000 );
  await page.click( '#btnLogin' );

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

  const frameUrl = await popup.evaluate( () => {
    const url = document.querySelector( '#ifrmDetail' );

    return url.src;
  } );

  await popup.goto( frameUrl );

  let branches = await popup.evaluate( () => {
    const options = Array.from( document.querySelectorAll( '#ddlBranch option' ) );

    return options.map( ( opt ) => opt.textContent );
  } );

  branches = branches.filter( ( b ) => !branchExclusion.includes( b ) );

  console.log( branches );
} )();
