/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar programs_1 = __webpack_require__(/*! ./programs */ \"./src/programs.ts\");\r\nvar meshes_1 = __webpack_require__(/*! ./meshes */ \"./src/meshes.ts\");\r\nvar misc_1 = __webpack_require__(/*! ./misc */ \"./src/misc.ts\");\r\nvar canvas = document.getElementById(\"canvas\");\r\nvar gl = canvas.getContext(\"webgl\");\r\ngl.clearColor(0.2, 0.3, 0.5, 1.0);\r\ngl.clear(gl.COLOR_BUFFER_BIT);\r\nvar standardMaterial = new programs_1.StandardMaterialProgram(gl);\r\nvar vertexBuffer = misc_1.createVertexBuffer(gl, new Float32Array([\r\n    -0.5, -1, -0.5 - 1,\r\n    0.5, -1, -0.5 - 1,\r\n    -0.5, -1, 0.5 - 1,\r\n    0.5, -1, 0.5 - 1\r\n]).buffer);\r\nvar indexBuffer = misc_1.createIndexBuffer(gl, new Uint16Array([\r\n    0, 1, 2,\r\n    1, 3, 2\r\n]).buffer);\r\nvar binding = new meshes_1.VertexBinding(vertexBuffer, [\r\n    {\r\n        location: 0,\r\n        size: 3,\r\n        type: gl.FLOAT,\r\n        normalized: false,\r\n        stride: 12,\r\n        offset: 0\r\n    }\r\n]);\r\nvar stream = new meshes_1.VertexStream([binding]);\r\nvar indexedStream = new meshes_1.IndexedVertexStream(stream, indexBuffer);\r\nindexedStream.bind(gl);\r\nstandardMaterial.use(gl);\r\nstandardMaterial.setUniforms(gl);\r\ngl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);\r\n\n\n//# sourceURL=webpack:///./src/index.ts?");

/***/ }),

/***/ "./src/meshes.ts":
/*!***********************!*\
  !*** ./src/meshes.ts ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar VertexBinding = /** @class */ (function () {\r\n    function VertexBinding(vertexBuffer, attributes) {\r\n        this.vertexBuffer = vertexBuffer;\r\n        this.attributes = attributes;\r\n    }\r\n    VertexBinding.prototype.bind = function (gl) {\r\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);\r\n        for (var _i = 0, _a = this.attributes; _i < _a.length; _i++) {\r\n            var attribute = _a[_i];\r\n            gl.enableVertexAttribArray(attribute.location);\r\n            gl.vertexAttribPointer(attribute.location, attribute.size, attribute.type, attribute.normalized, attribute.stride, attribute.offset);\r\n        }\r\n        gl.bindBuffer(gl.ARRAY_BUFFER, null);\r\n    };\r\n    return VertexBinding;\r\n}());\r\nexports.VertexBinding = VertexBinding;\r\nvar VertexStream = /** @class */ (function () {\r\n    function VertexStream(vertexBindings) {\r\n        this.vertexBindings = vertexBindings;\r\n    }\r\n    VertexStream.prototype.bind = function (gl) {\r\n        for (var _i = 0, _a = this.vertexBindings; _i < _a.length; _i++) {\r\n            var binding = _a[_i];\r\n            binding.bind(gl);\r\n        }\r\n    };\r\n    return VertexStream;\r\n}());\r\nexports.VertexStream = VertexStream;\r\nvar IndexedVertexStream = /** @class */ (function () {\r\n    function IndexedVertexStream(vertexStream, indexBuffer) {\r\n        this.vertexStream = vertexStream;\r\n        this.indexBuffer = indexBuffer;\r\n    }\r\n    IndexedVertexStream.prototype.bind = function (gl) {\r\n        this.vertexStream.bind(gl);\r\n        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);\r\n    };\r\n    return IndexedVertexStream;\r\n}());\r\nexports.IndexedVertexStream = IndexedVertexStream;\r\n\n\n//# sourceURL=webpack:///./src/meshes.ts?");

/***/ }),

/***/ "./src/misc.ts":
/*!*********************!*\
  !*** ./src/misc.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nfunction createProgram(gl, vsSrc, fsSrc, locations) {\r\n    var vs = gl.createShader(gl.VERTEX_SHADER);\r\n    gl.shaderSource(vs, vsSrc);\r\n    gl.compileShader(vs);\r\n    console.log(gl.getShaderInfoLog(vs));\r\n    var fs = gl.createShader(gl.FRAGMENT_SHADER);\r\n    gl.shaderSource(fs, fsSrc);\r\n    gl.compileShader(fs);\r\n    console.log(gl.getShaderInfoLog(fs));\r\n    var program = gl.createProgram();\r\n    gl.attachShader(program, vs);\r\n    gl.attachShader(program, fs);\r\n    for (var attributeName in locations) {\r\n        gl.bindAttribLocation(program, locations[attributeName], attributeName);\r\n    }\r\n    gl.linkProgram(program);\r\n    console.log(gl.getProgramInfoLog(program));\r\n    return program;\r\n}\r\nexports.createProgram = createProgram;\r\nfunction createVertexBuffer(gl, vertexData) {\r\n    var vertexBuffer = gl.createBuffer();\r\n    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);\r\n    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);\r\n    gl.bindBuffer(gl.ARRAY_BUFFER, null);\r\n    return vertexBuffer;\r\n}\r\nexports.createVertexBuffer = createVertexBuffer;\r\nfunction createIndexBuffer(gl, indexData) {\r\n    var indexBuffer = gl.createBuffer();\r\n    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);\r\n    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);\r\n    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);\r\n    return indexBuffer;\r\n}\r\nexports.createIndexBuffer = createIndexBuffer;\r\n\n\n//# sourceURL=webpack:///./src/misc.ts?");

/***/ }),

/***/ "./src/programs.ts":
/*!*************************!*\
  !*** ./src/programs.ts ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar misc_1 = __webpack_require__(/*! ./misc */ \"./src/misc.ts\");\r\nvar StandardMaterialProgram = /** @class */ (function () {\r\n    function StandardMaterialProgram(gl) {\r\n        this.program = misc_1.createProgram(gl, \"\\n      precision mediump float;\\n\\n      attribute vec4 a_position;\\n\\n      uniform mat4 u_projectViewModel;\\n\\n      void main(void) {\\n        gl_Position = u_projectViewModel * a_position;\\n      }\\n    \", \"\\n      precision mediump float;\\n\\n      void main(void) {\\n        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\\n      }\\n    \", {\r\n            \"a_position\": 0\r\n        });\r\n        this.projectViewModelLocation = gl.getUniformLocation(this.program, \"u_projectViewModel\");\r\n    }\r\n    StandardMaterialProgram.prototype.use = function (gl) {\r\n        gl.useProgram(this.program);\r\n    };\r\n    StandardMaterialProgram.prototype.setUniforms = function (gl) {\r\n        var n = 0.1;\r\n        var f = 100.0;\r\n        var r = 16 / 9.0;\r\n        var t = 1.0;\r\n        gl.uniformMatrix4fv(this.projectViewModelLocation, false, new Float32Array([\r\n            n / r, 0, 0, 0, 0, n / t, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0\r\n        ]));\r\n    };\r\n    return StandardMaterialProgram;\r\n}());\r\nexports.StandardMaterialProgram = StandardMaterialProgram;\r\n\n\n//# sourceURL=webpack:///./src/programs.ts?");

/***/ })

/******/ });