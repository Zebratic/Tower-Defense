/* Requires */
const fs = require("fs");

/**
 * @module VanillaRequire
 * This class can read Javascript classes and convert to false Node Modules.
 * 
 * @author Leonardo Mauro <leo.mauro.desenv@gmail.com> (http://leonardomauro.com/)
 * @link https://github.com/leomaurodesenv/vanilla-require GitHub
 * @license https://opensource.org/licenses/GPL-3.0 GNU Public License (GPLv3)
 * @copyright 2019 Leonardo Mauro
 * @package vanilla-require
 * @access public
 */
class VanillaRequire {

    /**
     * @method module:VanillaRequire
     * Constructor of class
     * @var {String} path       - Directory path: __dirname
     * @var {String} spliter    - Chacter that split the path
                                  in Linux SO: "/"
                                  in Windows SO: "\\"
     * @instance
     * @access public
     * @returns {this}
     */
    constructor(path, spliter="/") {
        this.path = path;
        this.spliter = spliter;
    }


    /**
     * @method module:VanillaRequire::_getPath
     * Return the path of a file
     * @arg {String} filePath   - File path
     * @access private
     * @return {String}
     */
    _getPath(filePath){
        return [this.path, filePath].join(this.spliter);
    }

    /**
     * @method module:VanillaRequire::_read
     * Read a file
     * @arg {String} filePath   - File path
     * @access private
     * @return {Blob}
     */
    _read(filePath) {
        return fs.readFileSync(this._getPath(filePath)).toString();
    }

    /**
     * @method module:VanillaRequire::require
     * Convert Javascript var to a false Module Node.js
     * @arg {String} filePath   - File path
     * @access public
     * @return {class}
     */
    require(filePath) {
        try{
            var jsFile = this._read(filePath);
            return eval("("+jsFile+")");
        }
        catch(e){ 
            console.error("Error: file not exist\n - "+this._getPath(filePath));
            return null; 
        }
    }

}

/* Module this class */
module.exports = function(path, spliter="/") {
    return new VanillaRequire(path, spliter);
};