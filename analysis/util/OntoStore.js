"use strict";
/**
 * provide access to the ontology data
 */

// includes
var Fs        = require( 'fs' ),
    Cfg       = require( '../config/config' ),
    Structure = require( '../config/structure' ),
    
    SynSet    = require( './OntoStore/SynSet' ),
    SemObject = require( './OntoStore/SemObject' ),
    SemUnit   = require( './OntoStore/SemUnit' ),
    SemPrefix = require( './OntoStore/SemPrefix' ),
    SemDimension = require( './OntoStore/SemDimension' )
    ;


/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXX getResultTypes XXXXXXXXXXXXXXXXXXXXXXXXXXXX */


// files to check
var resultTypes = Object.keys( Structure )
                  .filter( function( el ){
                    return [ 'OPTIONAL' ].indexOf( el ) < 0;
                  });
freeze( resultTypes );

/**
 * returns a list of all result files directly created from the ontologies
 * (no later analysis files)
 */
function getResultTypes() {
  return resultTypes;
}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX getData XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

// cache the data
var cachedData = {};

/**
 * return for a given ontology and the requested dataset as generated previously
 * 
 * if the data is currently not cached, it is taken from /res/
 * 
 * @param {String}  onto
 * @param {String}  dataset
 * @returns {Object}
 */
function getData( onto, dataset ){

  // we have seen this data
  if( (onto in cachedData) && (dataset in cachedData[onto])){
    return cachedData[onto][dataset];
  }
 
  // does the file exist at all?
  var path = Cfg.targetPath + onto + '/' + dataset + '.json';
  if( !fileExists( path ) ){
    return [];
  }
  
  // load the file and parse it
  var content = Fs.readFileSync( path ),
      data    = JSON.parse( content );
  
  // freeze the object
  freeze( data );
  
  // add to cache
  cachedData[ onto ] = cachedData[ onto ] || {};
  cachedData[ onto ][ dataset ] = data;
  
  // return
  return data;

}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXX getOntologies XXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

/**
 * returns the list of all ontologies by name
 * 
 * list is generated by listing all subfolders under /data/
 */
function getOntologies(){

  return Fs.readdirSync( Cfg.dataPath )
           .filter( function( file ){
             return Fs.lstatSync( Cfg.dataPath + '/' + file ).isDirectory();
           });

}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX getResult XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

var resultCache = {};

/**
 * get a previously persisted result
 * 
 * @param     {String}  name
 * @returns   {*}
 */
function getResult( name ) {
  
  // look for cache hit
  if( name in resultCache ) {
    return resultCache[ name ];
  }
  
  // else try to load from file system
  var files = Fs.readdirSync( Cfg.targetPath ),
      fileSuffix = name + '.json';
  for( var i=0; i<files.length; i++ ) {
   
    // search for the matching file
    if( (files[i].lastIndexOf( fileSuffix ) == (files[i].length - fileSuffix.length))
        && (fileSuffix.length < files[i].length) ) {

      // load the file
      var file = Fs.readFileSync( Cfg.targetPath + '/' + files[i], 'utf8' );

      // parse it
      var data = JSON.parse( file );
      
      // deserialize
      data = deserialize( data );
      
      // freeze the result
      data = freeze( data );
      
      // add to resultCache
      resultCache[ name ] = data;
      
      // return
      return data;
      
    }
    
  }
  
}

/**
 * reverse function to serialize()
 * 
 * @param obj
 * @returns
 */
function deserialize( obj ) {
  
  // walk through arrays
  if( obj instanceof Array ) {
    return obj.map( deserialize );
  }
  
  switch( obj.__type ) {
  
    // JS built in: Set
    case 'Set':
      var res = new Set();
      for( var i=0; i<obj.values.length; i++ ) {
        var entry = deserialize( obj.values[i] );
        res.add( entry );
      }
      return res;
     
    // custom type: OntoStore/SynSet
    case 'SynSet':
      var res = new SynSet();
      for( var i=0; i<obj.values.length; i++ ) {
        var entry = deserialize( obj.values[i] );
        res.addSynonym( entry );
      }
      return res;
      
    // custom type: OntoStore/SemDimension
    case 'SemDimension':

      // look for cache hit
      if( obj.uri in entityCache ) {
        return entityCache[ obj.uri ];
      }
      
      // create new
      var instance = new SemDimension( obj.uri, obj.dispLabel );
      if( obj.dimVector.length > 0 ){ instance.setVector( obj.dimVector ); }
      if( obj.ontology ) { instance.setOntology( obj.ontology ); }
      if( obj.raw )      { instance.setRaw( raw ); }
      for( var i=0; i<obj.labels.length; i++ ) {
        instance.addLabel( obj.labels[i] );
      }

      // add to cache and return
      entityCache[ obj.uri ] = instance;
      return instance;
      
      
    // custom type: OntoStore/SemUnit
    case 'SemUnit':
      
      // look for cache hit
      if( obj.uri in entityCache ) {
        return entityCache[ obj.uri ];
      }

      // create new
      var instance = new SemUnit( obj.uri, obj.dispLabel );
      if( obj.ontology ) { instance.setOntology( obj.ontology ); }
      if( obj.raw )      { instance.setRaw( raw ); }
      if( 'isPrefixed' in obj ) {
        if( 'isHeuristicPrefix' in obj ) {
          instance.isHeuristicPrefix( obj.isHeuristicPrefix );
        } else {
          instance.isPrefixed( obj.isPrefixed ); 
        }
      }
      for( var i=0; i<obj.labels.length; i++ ) {
        instance.addLabel( obj.labels[i] );
      }
      
      // add to cache and return
      entityCache[ obj.uri ] = instance;
      return instance;
  
      
     // custom type: OntoStore/SemObject
    case 'SemObject':
      
      // look for cache hit
      if( obj.uri in entityCache ) {
        return entityCache[ obj.uri ];
      }

      // create new
      var instance = new SemObject( obj.uri, obj.dispLabel );
      if( obj.ontology ) { instance.setOntology( obj.ontology ); }
      if( obj.raw )      { instance.setRaw( raw ); }
      for( var i=0; i<obj.labels.length; i++ ) {
        instance.addLabel( obj.labels[i] );
      }
      
      // add to cache and return
      entityCache[ obj.uri ] = instance;
      return instance;
  
      
      // custom type: OntoStore/SemPrefix
     case 'SemPrefix':

       // look for cache hit
       if( obj.uri in entityCache ) {
         return entityCache[ obj.uri ];
       }

       // create new
       var instance = new SemPrefix( obj.uri, obj.dispLabel );
       if( obj.ontology ) { instance.setOntology( obj.ontology ); }
       if( obj.factor )   { instance.setFactor( obj.factor ); }
       if( obj.raw )      { instance.setRaw( obj.raw ); }
       for( var i=0; i<obj.labels.length; i++ ) {
         instance.addLabel( obj.labels[i] );
       }

       // add to cache and return
       entityCache[ obj.uri ] = instance;
       return instance;


    // default: deal with the rest
    default:
      
      // plain object, deserialize all properties
      if( obj instanceof Object ) {
        
        var res = {};
        Object.keys( obj )
              .forEach( (prop) => {
                res[ prop ] = deserialize( obj[ prop ] );
              })
        return res;
        
      } else {
        return obj;        
      }
  }
  
}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX storeResult XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

/**
 * persist the given result as identified by key and name to disk
 * also freezes it and adds it to the cache for further reference
 * 
 * @param {String}  key
 * @param {String}  name
 * @param {Object}  result
 */
function storeResult( key, name, result ) {
  
  // write results to file
  Fs.writeFileSync( Cfg.targetPath + '/' + key + ' ' + name + '.json', 
                    JSON.stringify( result, serialize, ' ' ) );

  // freeze the result
  result = freeze( result );
  
  // add to cache by name
  resultCache[ name ] = result;

}


/**
 * serialize the given object
 * used to be able to serialize all the custom types used
 * 
 * @param {String}  key
 * @param {*}       value
 */
function serialize( key, value ) {

  switch( true ) {
  
    // JS built in: Set
    case (value instanceof Set):
       return { __type: 'Set', values: [... value] };
  
    // custom type: OntoStore/SynSet
    case (value instanceof SynSet):
      return { __type: 'SynSet', values: value.getSynonyms() };
      
    // custom type: OntoStore/SemDimension
    case (value instanceof SemDimension):
      return { 
        __type: 'SemDimension', 
        uri:        value.getURI(), 
        ontology:   value.getOntology(),
        dimVector:  value.getVector(),
        labels:     value.getLabels(),
        dispLabel:  value.getDisplayLabel(),
        raw:        value.getRaw()
      };
      
    // custom type: OntoStore/SemUnit
    case (value instanceof SemUnit):
      return { 
        __type: 'SemUnit', 
        uri:        value.getURI(), 
        ontology:   value.getOntology(),
        labels:     value.getLabels(),
        dispLabel:  value.getDisplayLabel(),
        isPrefixed: value.isPrefixed(),
        raw:        value.getRaw(),
        isHeuristicPrefix: value.isHeuristicPrefix()
      };
      
    // custom type: OntoStore/SemPrefix
    case (value instanceof SemPrefix):
      return { 
        __type: 'SemPrefix', 
        uri:        value.getURI(), 
        ontology:   value.getOntology(),
        labels:     value.getLabels(),
        dispLabel:  value.getDisplayLabel(),
        factor:     value.getFactor(),
        raw:        value.getRaw()
      };
      
    // custom type: OntoStore/SemObject
    case (value instanceof SemObject):
      return { 
        __type: 'SemObject', 
        uri:        value.getURI(), 
        ontology:   value.getOntology(),
        labels:     value.getLabels(),
        dispLabel:  value.getDisplayLabel(),
        raw:        value.getRaw()
      };
    
    // default: let JS handle it
    default: return value;

  }
}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX loadPredefinedData XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

/**
 * load a csv file form the data folder and parse it to an JS array
 * 
 * @param   {String}  name
 * @returns {Array}
 */
function loadPredefinedData( name ) {
  
  // create path
  var path = Cfg.targetPath + '/../data/' + name;
  
  // does the file exist at all?
  if( !fileExists( path ) ){
    return [];
  }
  
  // load file
  var file = Fs.readFileSync( path, 'utf8' ).trim();
  
  // empty file => empty array
  if( file == '' ) {
    return [];
  }

  // parse the file contents
  return file.split( "\n" )
              .map( (line) => {
                return line.split( ';' )
                           .map( (uri) => JSON.parse(uri) );
              });
}


/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX getEntity XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

// cache semantic objects
var entityCache = {};


/**
 * return a wrapper object for the semantic object given by uri
 * 
 * @param   {String}      uri
 * @param   {String}      label   the main label for this object / display label
 * @param   {Number}      type    the type of the object
 * @param   {String}      onto    the ontology this object belongs to
 * @returns {SemObject}
 */
function getEntity( uri, label, type, onto ) {

  // get constructor
  var Constructor;
  switch( type ){
  
    case this.DIMENSION: Constructor = require( './OntoStore/SemDimension' ); break;
    
    case this.UNIT:      Constructor = require( './OntoStore/SemUnit' ); break;
    
    case this.PREFIX:    Constructor = require( './OntoStore/SemPrefix' ); break;
    
    case this.OBJECT:    Constructor = require( './OntoStore/SemObject' ); break;
    
    default: throw Error( 'Unknown type: ' + type );
    
  }
  
  // if cached, return cached version
  if( (onto in entityCache) && (uri in entityCache[ onto ]) ) {
    
    // check type
    if( !(entityCache[ onto ][ uri ] instanceof Constructor) ) {
      throw new Error( 'Cached version has a different type!' );
    }
      
    // all well, return cached
    return entityCache[ onto ][ uri ];
  }
  
  // create instance
  var instance = new Constructor( uri, label );
 
  // add name of ontology, if present
  if( onto ) {
    instance.setOntology( onto );
  }
  
  // set in cache
  entityCache[ onto ] = entityCache[ onto ] || {};
  entityCache[ onto ][ uri ] = instance;
  
  // return
  return instance;
  
}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Helper XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

/**
 * check, if a specific file already exists
 */
function fileExists( path ) {
  try{
    Fs.accessSync( path, Fs.R_OK | Fs.F_OK );
    return true;
  } catch( e ){
    return false;
  }
}

/**
 * deep freeze of an object
 */
function freeze( obj ) {
  
  // freeze itself
  Object.freeze( obj );
  
  // freeze all relevenat subproperties
  var keys = Object.getOwnPropertyNames( obj );
  for( var i=0; i<keys.length; i++ ) {
    
    var o = obj[ keys[i] ];
    if( [ 'object', 'function' ].indexOf( typeof o ) > -1 ){
      freeze( o );
    }
    
  }
  
  return obj;
}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Export XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

module.exports = {
    getData:        getData,
    getOntologies:  getOntologies,
    getResultTypes: getResultTypes,
    getEntity:      getEntity,
    storeResult:    storeResult,
    getResult:      getResult,
    loadPredefinedData: loadPredefinedData,
    
    // @const
    DIMENSION:  1,
    UNIT:       2,
    PREFIX:     3,
    OBJECT:     4
};