"use strict";
/**
 * Create HTML output for units with multiple labels
 */

// includes
var Q           = require( 'q' ),
    Log         = require( './util/log.js' ),
    OntoStore   = require( './util/OntoStore' ),
    TemplStore  = require( './util/TemplStore' );

// local settings
var localCfg = {
      moduleName: 'multipleLabels',
      moduleKey:  '9700'
    },
    log = function( msg, type ) {
      Log( localCfg.moduleName, msg, type );
    };


function multipleLabels() {

  // get conversion mismatches
  var multipleLabels = OntoStore.getResult( 'multipleLabels' );
  
  // collect output
  var out = [];
  
  // walk all ontologies
  for( var onto in multipleLabels ) {

    // output
    out.push( '<h2><ul><li data-onto="', onto, '">', onto, '</ul></h2>' );

    // walk all types
    for( var type in multipleLabels[ onto ] ) {
      
      // shortcut
      var entries = multipleLabels[ onto ][ type ];
      
      // just, where there are entries
      if( entries.length > 0 ) {
        
        out.push( '<h3>', type, '</h3><ul>' );
        
        for( var entry of entries ) {
          
          out.push( '<li><a href="', entry.uri, '">', entry.uri, '</a><ul>' );
          
          for( var label of entry.labels ) {
            out.push( '<li>', label );
          }
          
          out.push( '</ul>' );
          
        }
        
        out.push( '</ul>' );
        
      }
      
    }
    
  }
    
  // write results to file
  log( 'written output' );
  TemplStore.writeResult( localCfg.moduleKey, localCfg.moduleName, {
    content: out.join('')
  });
  
  // done
  return Q( true );    

}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Export XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

// if called directly, execute, else export
if(require.main === module) {
  multipleLabels().done(); 
} else { 
  module.exports = multipleLabels; 
}