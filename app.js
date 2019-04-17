/* eslint-disable no-shadow */
/* eslint-disable no-loop-func */
require( 'dotenv' ).config();
import puppeteer from 'puppeteer';

( async() => {
  const branchExclusion = [ 'All', 'Cornerstone Wide', 'Operational Support', 'Training Academy' ],
    teamExclusion = [ 'All' ],
    date = '08/04/2019',
    data = [],
    browser = await puppeteer.launch( { headless: false, slowMo: 50 } ),
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

    // TODO loop through teams
    await popup.select( '#ddlBranchArea', teams[ 0 ].value );
    await popup.waitFor( 1500 );

    data.push( {
      branch: branches[ 0 ].name,
      service: teams[ 0 ].name,
      generated: false
    } );
  }

  console.log( 'beep' );
} )();
