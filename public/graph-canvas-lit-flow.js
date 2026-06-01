var WorkGraphGraphCanvas = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/graphCanvasLitFlow/client/mountGraphCanvasLitFlow.ts
  var mountGraphCanvasLitFlow_exports = {};
  __export(mountGraphCanvasLitFlow_exports, {
    mountAllGraphCanvasLitFlowHosts: () => mountAllGraphCanvasLitFlowHosts,
    mountGraphCanvasLitFlow: () => mountGraphCanvasLitFlow
  });

  // node_modules/d3-dispatch/src/dispatch.js
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i7 = 0, n7 = arguments.length, _2 = {}, t5; i7 < n7; ++i7) {
      if (!(t5 = arguments[i7] + "") || t5 in _2 || /[\s.]/.test(t5)) throw new Error("illegal type: " + t5);
      _2[t5] = [];
    }
    return new Dispatch(_2);
  }
  function Dispatch(_2) {
    this._ = _2;
  }
  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t5) {
      var name = "", i7 = t5.indexOf(".");
      if (i7 >= 0) name = t5.slice(i7 + 1), t5 = t5.slice(0, i7);
      if (t5 && !types.hasOwnProperty(t5)) throw new Error("unknown type: " + t5);
      return { type: t5, name };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _2 = this._, T2 = parseTypenames(typename + "", _2), t5, i7 = -1, n7 = T2.length;
      if (arguments.length < 2) {
        while (++i7 < n7) if ((t5 = (typename = T2[i7]).type) && (t5 = get(_2[t5], typename.name))) return t5;
        return;
      }
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i7 < n7) {
        if (t5 = (typename = T2[i7]).type) _2[t5] = set(_2[t5], typename.name, callback);
        else if (callback == null) for (t5 in _2) _2[t5] = set(_2[t5], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy = {}, _2 = this._;
      for (var t5 in _2) copy[t5] = _2[t5].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n7 = arguments.length - 2) > 0) for (var args = new Array(n7), i7 = 0, n7, t5; i7 < n7; ++i7) args[i7] = arguments[i7 + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t5 = this._[type], i7 = 0, n7 = t5.length; i7 < n7; ++i7) t5[i7].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t5 = this._[type], i7 = 0, n7 = t5.length; i7 < n7; ++i7) t5[i7].value.apply(that, args);
    }
  };
  function get(type, name) {
    for (var i7 = 0, n7 = type.length, c5; i7 < n7; ++i7) {
      if ((c5 = type[i7]).name === name) {
        return c5.value;
      }
    }
  }
  function set(type, name, callback) {
    for (var i7 = 0, n7 = type.length; i7 < n7; ++i7) {
      if (type[i7].name === name) {
        type[i7] = noop, type = type.slice(0, i7).concat(type.slice(i7 + 1));
        break;
      }
    }
    if (callback != null) type.push({ name, value: callback });
    return type;
  }
  var dispatch_default = dispatch;

  // node_modules/d3-selection/src/namespaces.js
  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces_default = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  // node_modules/d3-selection/src/namespace.js
  function namespace_default(name) {
    var prefix = name += "", i7 = prefix.indexOf(":");
    if (i7 >= 0 && (prefix = name.slice(0, i7)) !== "xmlns") name = name.slice(i7 + 1);
    return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
  }

  // node_modules/d3-selection/src/creator.js
  function creatorInherit(name) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator_default(name) {
    var fullname = namespace_default(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  // node_modules/d3-selection/src/selector.js
  function none() {
  }
  function selector_default(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  // node_modules/d3-selection/src/selection/select.js
  function select_default(select) {
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, subgroup = subgroups[j] = new Array(n7), node, subnode, i7 = 0; i7 < n7; ++i7) {
        if ((node = group[i7]) && (subnode = select.call(node, node.__data__, i7, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i7] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/array.js
  function array(x2) {
    return x2 == null ? [] : Array.isArray(x2) ? x2 : Array.from(x2);
  }

  // node_modules/d3-selection/src/selectorAll.js
  function empty() {
    return [];
  }
  function selectorAll_default(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectAll.js
  function arrayAll(select) {
    return function() {
      return array(select.apply(this, arguments));
    };
  }
  function selectAll_default(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, node, i7 = 0; i7 < n7; ++i7) {
        if (node = group[i7]) {
          subgroups.push(select.call(node, node.__data__, i7, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }

  // node_modules/d3-selection/src/matcher.js
  function matcher_default(selector) {
    return function() {
      return this.matches(selector);
    };
  }
  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectChild.js
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selectChild_default(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/selectChildren.js
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selectChildren_default(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/filter.js
  function filter_default(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, subgroup = subgroups[j] = [], node, i7 = 0; i7 < n7; ++i7) {
        if ((node = group[i7]) && match.call(node, node.__data__, i7, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/selection/sparse.js
  function sparse_default(update) {
    return new Array(update.length);
  }

  // node_modules/d3-selection/src/selection/enter.js
  function enter_default() {
    return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  // node_modules/d3-selection/src/constant.js
  function constant_default(x2) {
    return function() {
      return x2;
    };
  }

  // node_modules/d3-selection/src/selection/data.js
  function bindIndex(parent, group, enter, update, exit, data) {
    var i7 = 0, node, groupLength = group.length, dataLength = data.length;
    for (; i7 < dataLength; ++i7) {
      if (node = group[i7]) {
        node.__data__ = data[i7];
        update[i7] = node;
      } else {
        enter[i7] = new EnterNode(parent, data[i7]);
      }
    }
    for (; i7 < groupLength; ++i7) {
      if (node = group[i7]) {
        exit[i7] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data, key) {
    var i7, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
    for (i7 = 0; i7 < groupLength; ++i7) {
      if (node = group[i7]) {
        keyValues[i7] = keyValue = key.call(node, node.__data__, i7, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i7] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i7 = 0; i7 < dataLength; ++i7) {
      keyValue = key.call(parent, data[i7], i7, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i7] = node;
        node.__data__ = data[i7];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i7] = new EnterNode(parent, data[i7]);
      }
    }
    for (i7 = 0; i7 < groupLength; ++i7) {
      if ((node = group[i7]) && nodeByKeyValue.get(keyValues[i7]) === node) {
        exit[i7] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function data_default(value, key) {
    if (!arguments.length) return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function") value = constant_default(value);
    for (var m2 = groups.length, update = new Array(m2), enter = new Array(m2), exit = new Array(m2), j = 0; j < m2; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data) {
    return typeof data === "object" && "length" in data ? data : Array.from(data);
  }

  // node_modules/d3-selection/src/selection/exit.js
  function exit_default() {
    return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
  }

  // node_modules/d3-selection/src/selection/join.js
  function join_default(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove();
    else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  // node_modules/d3-selection/src/selection/merge.js
  function merge_default(context) {
    var selection2 = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n7 = group0.length, merge = merges[j] = new Array(n7), node, i7 = 0; i7 < n7; ++i7) {
        if (node = group0[i7] || group1[i7]) {
          merge[i7] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }

  // node_modules/d3-selection/src/selection/order.js
  function order_default() {
    for (var groups = this._groups, j = -1, m2 = groups.length; ++j < m2; ) {
      for (var group = groups[j], i7 = group.length - 1, next = group[i7], node; --i7 >= 0; ) {
        if (node = group[i7]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/sort.js
  function sort_default(compare) {
    if (!compare) compare = ascending;
    function compareNode(a4, b3) {
      return a4 && b3 ? compare(a4.__data__, b3.__data__) : !a4 - !b3;
    }
    for (var groups = this._groups, m2 = groups.length, sortgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, sortgroup = sortgroups[j] = new Array(n7), node, i7 = 0; i7 < n7; ++i7) {
        if (node = group[i7]) {
          sortgroup[i7] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending(a4, b3) {
    return a4 < b3 ? -1 : a4 > b3 ? 1 : a4 >= b3 ? 0 : NaN;
  }

  // node_modules/d3-selection/src/selection/call.js
  function call_default() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  // node_modules/d3-selection/src/selection/nodes.js
  function nodes_default() {
    return Array.from(this);
  }

  // node_modules/d3-selection/src/selection/node.js
  function node_default() {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i7 = 0, n7 = group.length; i7 < n7; ++i7) {
        var node = group[i7];
        if (node) return node;
      }
    }
    return null;
  }

  // node_modules/d3-selection/src/selection/size.js
  function size_default() {
    let size = 0;
    for (const node of this) ++size;
    return size;
  }

  // node_modules/d3-selection/src/selection/empty.js
  function empty_default() {
    return !this.node();
  }

  // node_modules/d3-selection/src/selection/each.js
  function each_default(callback) {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i7 = 0, n7 = group.length, node; i7 < n7; ++i7) {
        if (node = group[i7]) callback.call(node, node.__data__, i7, group);
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/attr.js
  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.removeAttribute(name);
      else this.setAttribute(name, v2);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v2);
    };
  }
  function attr_default(name, value) {
    var fullname = namespace_default(name);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  // node_modules/d3-selection/src/window.js
  function window_default(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }

  // node_modules/d3-selection/src/selection/style.js
  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }
  function styleFunction(name, value, priority) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v2, priority);
    };
  }
  function style_default(name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  // node_modules/d3-selection/src/selection/property.js
  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }
  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }
  function propertyFunction(name, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) delete this[name];
      else this[name] = v2;
    };
  }
  function property_default(name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }

  // node_modules/d3-selection/src/selection/classed.js
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name) {
      var i7 = this._names.indexOf(name);
      if (i7 < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i7 = this._names.indexOf(name);
      if (i7 >= 0) {
        this._names.splice(i7, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };
  function classedAdd(node, names) {
    var list = classList(node), i7 = -1, n7 = names.length;
    while (++i7 < n7) list.add(names[i7]);
  }
  function classedRemove(node, names) {
    var list = classList(node), i7 = -1, n7 = names.length;
    while (++i7 < n7) list.remove(names[i7]);
  }
  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }
  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }
  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }
  function classed_default(name, value) {
    var names = classArray(name + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i7 = -1, n7 = names.length;
      while (++i7 < n7) if (!list.contains(names[i7])) return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }

  // node_modules/d3-selection/src/selection/text.js
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v2 = value.apply(this, arguments);
      this.textContent = v2 == null ? "" : v2;
    };
  }
  function text_default(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  // node_modules/d3-selection/src/selection/html.js
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v2 = value.apply(this, arguments);
      this.innerHTML = v2 == null ? "" : v2;
    };
  }
  function html_default(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  // node_modules/d3-selection/src/selection/raise.js
  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }
  function raise_default() {
    return this.each(raise);
  }

  // node_modules/d3-selection/src/selection/lower.js
  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function lower_default() {
    return this.each(lower);
  }

  // node_modules/d3-selection/src/selection/append.js
  function append_default(name) {
    var create2 = typeof name === "function" ? name : creator_default(name);
    return this.select(function() {
      return this.appendChild(create2.apply(this, arguments));
    });
  }

  // node_modules/d3-selection/src/selection/insert.js
  function constantNull() {
    return null;
  }
  function insert_default(name, before) {
    var create2 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
    return this.select(function() {
      return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  // node_modules/d3-selection/src/selection/remove.js
  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  function remove_default() {
    return this.each(remove);
  }

  // node_modules/d3-selection/src/selection/clone.js
  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function clone_default(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  // node_modules/d3-selection/src/selection/datum.js
  function datum_default(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  // node_modules/d3-selection/src/selection/on.js
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames2(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t5) {
      var name = "", i7 = t5.indexOf(".");
      if (i7 >= 0) name = t5.slice(i7 + 1), t5 = t5.slice(0, i7);
      return { type: t5, name };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i7 = -1, m2 = on.length, o8; j < m2; ++j) {
        if (o8 = on[j], (!typename.type || o8.type === typename.type) && o8.name === typename.name) {
          this.removeEventListener(o8.type, o8.listener, o8.options);
        } else {
          on[++i7] = o8;
        }
      }
      if (++i7) on.length = i7;
      else delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o8, listener = contextListener(value);
      if (on) for (var j = 0, m2 = on.length; j < m2; ++j) {
        if ((o8 = on[j]).type === typename.type && o8.name === typename.name) {
          this.removeEventListener(o8.type, o8.listener, o8.options);
          this.addEventListener(o8.type, o8.listener = listener, o8.options = options);
          o8.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o8 = { type: typename.type, name: typename.name, value, listener, options };
      if (!on) this.__on = [o8];
      else on.push(o8);
    };
  }
  function on_default(typename, value, options) {
    var typenames = parseTypenames2(typename + ""), i7, n7 = typenames.length, t5;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m2 = on.length, o8; j < m2; ++j) {
        for (i7 = 0, o8 = on[j]; i7 < n7; ++i7) {
          if ((t5 = typenames[i7]).type === o8.type && t5.name === o8.name) {
            return o8.value;
          }
        }
      }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i7 = 0; i7 < n7; ++i7) this.each(on(typenames[i7], value, options));
    return this;
  }

  // node_modules/d3-selection/src/selection/dispatch.js
  function dispatchEvent(node, type, params) {
    var window2 = window_default(node), event = window2.CustomEvent;
    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window2.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }
  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }
  function dispatch_default2(type, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
  }

  // node_modules/d3-selection/src/selection/iterator.js
  function* iterator_default() {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i7 = 0, n7 = group.length, node; i7 < n7; ++i7) {
        if (node = group[i7]) yield node;
      }
    }
  }

  // node_modules/d3-selection/src/selection/index.js
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection() {
    return new Selection([[document.documentElement]], root);
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: select_default,
    selectAll: selectAll_default,
    selectChild: selectChild_default,
    selectChildren: selectChildren_default,
    filter: filter_default,
    data: data_default,
    enter: enter_default,
    exit: exit_default,
    join: join_default,
    merge: merge_default,
    selection: selection_selection,
    order: order_default,
    sort: sort_default,
    call: call_default,
    nodes: nodes_default,
    node: node_default,
    size: size_default,
    empty: empty_default,
    each: each_default,
    attr: attr_default,
    style: style_default,
    property: property_default,
    classed: classed_default,
    text: text_default,
    html: html_default,
    raise: raise_default,
    lower: lower_default,
    append: append_default,
    insert: insert_default,
    remove: remove_default,
    clone: clone_default,
    datum: datum_default,
    on: on_default,
    dispatch: dispatch_default2,
    [Symbol.iterator]: iterator_default
  };
  var selection_default = selection;

  // node_modules/d3-selection/src/select.js
  function select_default2(selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  // node_modules/d3-selection/src/sourceEvent.js
  function sourceEvent_default(event) {
    let sourceEvent;
    while (sourceEvent = event.sourceEvent) event = sourceEvent;
    return event;
  }

  // node_modules/d3-selection/src/pointer.js
  function pointer_default(event, node) {
    event = sourceEvent_default(event);
    if (node === void 0) node = event.currentTarget;
    if (node) {
      var svg = node.ownerSVGElement || node;
      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }
      if (node.getBoundingClientRect) {
        var rect = node.getBoundingClientRect();
        return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
      }
    }
    return [event.pageX, event.pageY];
  }

  // node_modules/d3-drag/src/noevent.js
  var nonpassivecapture = { capture: true, passive: false };
  function noevent_default(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  // node_modules/d3-drag/src/nodrag.js
  function nodrag_default(view) {
    var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", noevent_default, nonpassivecapture);
    if ("onselectstart" in root2) {
      selection2.on("selectstart.drag", noevent_default, nonpassivecapture);
    } else {
      root2.__noselect = root2.style.MozUserSelect;
      root2.style.MozUserSelect = "none";
    }
  }
  function yesdrag(view, noclick) {
    var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", null);
    if (noclick) {
      selection2.on("click.drag", noevent_default, nonpassivecapture);
      setTimeout(function() {
        selection2.on("click.drag", null);
      }, 0);
    }
    if ("onselectstart" in root2) {
      selection2.on("selectstart.drag", null);
    } else {
      root2.style.MozUserSelect = root2.__noselect;
      delete root2.__noselect;
    }
  }

  // node_modules/d3-color/src/define.js
  function define_default(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  // node_modules/d3-color/src/color.js
  function Color() {
  }
  var darker = 0.7;
  var brighter = 1 / darker;
  var reI = "\\s*([+-]?\\d+)\\s*";
  var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
  var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
  var reHex = /^#([0-9a-f]{3,8})$/;
  var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
  var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
  var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
  var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
  var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
  var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
  var named = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  define_default(Color, color, {
    copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });
  function color_formatHex() {
    return this.rgb().formatHex();
  }
  function color_formatHex8() {
    return this.rgb().formatHex8();
  }
  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }
  function color_formatRgb() {
    return this.rgb().formatRgb();
  }
  function color(format) {
    var m2, l4;
    format = (format + "").trim().toLowerCase();
    return (m2 = reHex.exec(format)) ? (l4 = m2[1].length, m2 = parseInt(m2[1], 16), l4 === 6 ? rgbn(m2) : l4 === 3 ? new Rgb(m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, (m2 & 15) << 4 | m2 & 15, 1) : l4 === 8 ? rgba(m2 >> 24 & 255, m2 >> 16 & 255, m2 >> 8 & 255, (m2 & 255) / 255) : l4 === 4 ? rgba(m2 >> 12 & 15 | m2 >> 8 & 240, m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, ((m2 & 15) << 4 | m2 & 15) / 255) : null) : (m2 = reRgbInteger.exec(format)) ? new Rgb(m2[1], m2[2], m2[3], 1) : (m2 = reRgbPercent.exec(format)) ? new Rgb(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, 1) : (m2 = reRgbaInteger.exec(format)) ? rgba(m2[1], m2[2], m2[3], m2[4]) : (m2 = reRgbaPercent.exec(format)) ? rgba(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, m2[4]) : (m2 = reHslPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, 1) : (m2 = reHslaPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, m2[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }
  function rgbn(n7) {
    return new Rgb(n7 >> 16 & 255, n7 >> 8 & 255, n7 & 255, 1);
  }
  function rgba(r5, g2, b3, a4) {
    if (a4 <= 0) r5 = g2 = b3 = NaN;
    return new Rgb(r5, g2, b3, a4);
  }
  function rgbConvert(o8) {
    if (!(o8 instanceof Color)) o8 = color(o8);
    if (!o8) return new Rgb();
    o8 = o8.rgb();
    return new Rgb(o8.r, o8.g, o8.b, o8.opacity);
  }
  function rgb(r5, g2, b3, opacity) {
    return arguments.length === 1 ? rgbConvert(r5) : new Rgb(r5, g2, b3, opacity == null ? 1 : opacity);
  }
  function Rgb(r5, g2, b3, opacity) {
    this.r = +r5;
    this.g = +g2;
    this.b = +b3;
    this.opacity = +opacity;
  }
  define_default(Rgb, rgb, extend(Color, {
    brighter(k2) {
      k2 = k2 == null ? brighter : Math.pow(brighter, k2);
      return new Rgb(this.r * k2, this.g * k2, this.b * k2, this.opacity);
    },
    darker(k2) {
      k2 = k2 == null ? darker : Math.pow(darker, k2);
      return new Rgb(this.r * k2, this.g * k2, this.b * k2, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));
  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }
  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function rgb_formatRgb() {
    const a4 = clampa(this.opacity);
    return `${a4 === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a4 === 1 ? ")" : `, ${a4})`}`;
  }
  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }
  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }
  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }
  function hsla(h3, s5, l4, a4) {
    if (a4 <= 0) h3 = s5 = l4 = NaN;
    else if (l4 <= 0 || l4 >= 1) h3 = s5 = NaN;
    else if (s5 <= 0) h3 = NaN;
    return new Hsl(h3, s5, l4, a4);
  }
  function hslConvert(o8) {
    if (o8 instanceof Hsl) return new Hsl(o8.h, o8.s, o8.l, o8.opacity);
    if (!(o8 instanceof Color)) o8 = color(o8);
    if (!o8) return new Hsl();
    if (o8 instanceof Hsl) return o8;
    o8 = o8.rgb();
    var r5 = o8.r / 255, g2 = o8.g / 255, b3 = o8.b / 255, min = Math.min(r5, g2, b3), max = Math.max(r5, g2, b3), h3 = NaN, s5 = max - min, l4 = (max + min) / 2;
    if (s5) {
      if (r5 === max) h3 = (g2 - b3) / s5 + (g2 < b3) * 6;
      else if (g2 === max) h3 = (b3 - r5) / s5 + 2;
      else h3 = (r5 - g2) / s5 + 4;
      s5 /= l4 < 0.5 ? max + min : 2 - max - min;
      h3 *= 60;
    } else {
      s5 = l4 > 0 && l4 < 1 ? 0 : h3;
    }
    return new Hsl(h3, s5, l4, o8.opacity);
  }
  function hsl(h3, s5, l4, opacity) {
    return arguments.length === 1 ? hslConvert(h3) : new Hsl(h3, s5, l4, opacity == null ? 1 : opacity);
  }
  function Hsl(h3, s5, l4, opacity) {
    this.h = +h3;
    this.s = +s5;
    this.l = +l4;
    this.opacity = +opacity;
  }
  define_default(Hsl, hsl, extend(Color, {
    brighter(k2) {
      k2 = k2 == null ? brighter : Math.pow(brighter, k2);
      return new Hsl(this.h, this.s, this.l * k2, this.opacity);
    },
    darker(k2) {
      k2 = k2 == null ? darker : Math.pow(darker, k2);
      return new Hsl(this.h, this.s, this.l * k2, this.opacity);
    },
    rgb() {
      var h3 = this.h % 360 + (this.h < 0) * 360, s5 = isNaN(h3) || isNaN(this.s) ? 0 : this.s, l4 = this.l, m2 = l4 + (l4 < 0.5 ? l4 : 1 - l4) * s5, m1 = 2 * l4 - m2;
      return new Rgb(
        hsl2rgb(h3 >= 240 ? h3 - 240 : h3 + 120, m1, m2),
        hsl2rgb(h3, m1, m2),
        hsl2rgb(h3 < 120 ? h3 + 240 : h3 - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a4 = clampa(this.opacity);
      return `${a4 === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a4 === 1 ? ")" : `, ${a4})`}`;
    }
  }));
  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }
  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }
  function hsl2rgb(h3, m1, m2) {
    return (h3 < 60 ? m1 + (m2 - m1) * h3 / 60 : h3 < 180 ? m2 : h3 < 240 ? m1 + (m2 - m1) * (240 - h3) / 60 : m1) * 255;
  }

  // node_modules/d3-interpolate/src/basis.js
  function basis(t1, v0, v1, v2, v3) {
    var t22 = t1 * t1, t32 = t22 * t1;
    return ((1 - 3 * t1 + 3 * t22 - t32) * v0 + (4 - 6 * t22 + 3 * t32) * v1 + (1 + 3 * t1 + 3 * t22 - 3 * t32) * v2 + t32 * v3) / 6;
  }
  function basis_default(values) {
    var n7 = values.length - 1;
    return function(t5) {
      var i7 = t5 <= 0 ? t5 = 0 : t5 >= 1 ? (t5 = 1, n7 - 1) : Math.floor(t5 * n7), v1 = values[i7], v2 = values[i7 + 1], v0 = i7 > 0 ? values[i7 - 1] : 2 * v1 - v2, v3 = i7 < n7 - 1 ? values[i7 + 2] : 2 * v2 - v1;
      return basis((t5 - i7 / n7) * n7, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/basisClosed.js
  function basisClosed_default(values) {
    var n7 = values.length;
    return function(t5) {
      var i7 = Math.floor(((t5 %= 1) < 0 ? ++t5 : t5) * n7), v0 = values[(i7 + n7 - 1) % n7], v1 = values[i7 % n7], v2 = values[(i7 + 1) % n7], v3 = values[(i7 + 2) % n7];
      return basis((t5 - i7 / n7) * n7, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/constant.js
  var constant_default2 = (x2) => () => x2;

  // node_modules/d3-interpolate/src/color.js
  function linear(a4, d3) {
    return function(t5) {
      return a4 + t5 * d3;
    };
  }
  function exponential(a4, b3, y3) {
    return a4 = Math.pow(a4, y3), b3 = Math.pow(b3, y3) - a4, y3 = 1 / y3, function(t5) {
      return Math.pow(a4 + t5 * b3, y3);
    };
  }
  function gamma(y3) {
    return (y3 = +y3) === 1 ? nogamma : function(a4, b3) {
      return b3 - a4 ? exponential(a4, b3, y3) : constant_default2(isNaN(a4) ? b3 : a4);
    };
  }
  function nogamma(a4, b3) {
    var d3 = b3 - a4;
    return d3 ? linear(a4, d3) : constant_default2(isNaN(a4) ? b3 : a4);
  }

  // node_modules/d3-interpolate/src/rgb.js
  var rgb_default = (function rgbGamma(y3) {
    var color2 = gamma(y3);
    function rgb2(start2, end) {
      var r5 = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g2 = color2(start2.g, end.g), b3 = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
      return function(t5) {
        start2.r = r5(t5);
        start2.g = g2(t5);
        start2.b = b3(t5);
        start2.opacity = opacity(t5);
        return start2 + "";
      };
    }
    rgb2.gamma = rgbGamma;
    return rgb2;
  })(1);
  function rgbSpline(spline) {
    return function(colors) {
      var n7 = colors.length, r5 = new Array(n7), g2 = new Array(n7), b3 = new Array(n7), i7, color2;
      for (i7 = 0; i7 < n7; ++i7) {
        color2 = rgb(colors[i7]);
        r5[i7] = color2.r || 0;
        g2[i7] = color2.g || 0;
        b3[i7] = color2.b || 0;
      }
      r5 = spline(r5);
      g2 = spline(g2);
      b3 = spline(b3);
      color2.opacity = 1;
      return function(t5) {
        color2.r = r5(t5);
        color2.g = g2(t5);
        color2.b = b3(t5);
        return color2 + "";
      };
    };
  }
  var rgbBasis = rgbSpline(basis_default);
  var rgbBasisClosed = rgbSpline(basisClosed_default);

  // node_modules/d3-interpolate/src/numberArray.js
  function numberArray_default(a4, b3) {
    if (!b3) b3 = [];
    var n7 = a4 ? Math.min(b3.length, a4.length) : 0, c5 = b3.slice(), i7;
    return function(t5) {
      for (i7 = 0; i7 < n7; ++i7) c5[i7] = a4[i7] * (1 - t5) + b3[i7] * t5;
      return c5;
    };
  }
  function isNumberArray(x2) {
    return ArrayBuffer.isView(x2) && !(x2 instanceof DataView);
  }

  // node_modules/d3-interpolate/src/array.js
  function genericArray(a4, b3) {
    var nb = b3 ? b3.length : 0, na = a4 ? Math.min(nb, a4.length) : 0, x2 = new Array(na), c5 = new Array(nb), i7;
    for (i7 = 0; i7 < na; ++i7) x2[i7] = value_default(a4[i7], b3[i7]);
    for (; i7 < nb; ++i7) c5[i7] = b3[i7];
    return function(t5) {
      for (i7 = 0; i7 < na; ++i7) c5[i7] = x2[i7](t5);
      return c5;
    };
  }

  // node_modules/d3-interpolate/src/date.js
  function date_default(a4, b3) {
    var d3 = /* @__PURE__ */ new Date();
    return a4 = +a4, b3 = +b3, function(t5) {
      return d3.setTime(a4 * (1 - t5) + b3 * t5), d3;
    };
  }

  // node_modules/d3-interpolate/src/number.js
  function number_default(a4, b3) {
    return a4 = +a4, b3 = +b3, function(t5) {
      return a4 * (1 - t5) + b3 * t5;
    };
  }

  // node_modules/d3-interpolate/src/object.js
  function object_default(a4, b3) {
    var i7 = {}, c5 = {}, k2;
    if (a4 === null || typeof a4 !== "object") a4 = {};
    if (b3 === null || typeof b3 !== "object") b3 = {};
    for (k2 in b3) {
      if (k2 in a4) {
        i7[k2] = value_default(a4[k2], b3[k2]);
      } else {
        c5[k2] = b3[k2];
      }
    }
    return function(t5) {
      for (k2 in i7) c5[k2] = i7[k2](t5);
      return c5;
    };
  }

  // node_modules/d3-interpolate/src/string.js
  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  var reB = new RegExp(reA.source, "g");
  function zero(b3) {
    return function() {
      return b3;
    };
  }
  function one(b3) {
    return function(t5) {
      return b3(t5) + "";
    };
  }
  function string_default(a4, b3) {
    var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i7 = -1, s5 = [], q = [];
    a4 = a4 + "", b3 = b3 + "";
    while ((am = reA.exec(a4)) && (bm = reB.exec(b3))) {
      if ((bs = bm.index) > bi) {
        bs = b3.slice(bi, bs);
        if (s5[i7]) s5[i7] += bs;
        else s5[++i7] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s5[i7]) s5[i7] += bm;
        else s5[++i7] = bm;
      } else {
        s5[++i7] = null;
        q.push({ i: i7, x: number_default(am, bm) });
      }
      bi = reB.lastIndex;
    }
    if (bi < b3.length) {
      bs = b3.slice(bi);
      if (s5[i7]) s5[i7] += bs;
      else s5[++i7] = bs;
    }
    return s5.length < 2 ? q[0] ? one(q[0].x) : zero(b3) : (b3 = q.length, function(t5) {
      for (var i8 = 0, o8; i8 < b3; ++i8) s5[(o8 = q[i8]).i] = o8.x(t5);
      return s5.join("");
    });
  }

  // node_modules/d3-interpolate/src/value.js
  function value_default(a4, b3) {
    var t5 = typeof b3, c5;
    return b3 == null || t5 === "boolean" ? constant_default2(b3) : (t5 === "number" ? number_default : t5 === "string" ? (c5 = color(b3)) ? (b3 = c5, rgb_default) : string_default : b3 instanceof color ? rgb_default : b3 instanceof Date ? date_default : isNumberArray(b3) ? numberArray_default : Array.isArray(b3) ? genericArray : typeof b3.valueOf !== "function" && typeof b3.toString !== "function" || isNaN(b3) ? object_default : number_default)(a4, b3);
  }

  // node_modules/d3-interpolate/src/transform/decompose.js
  var degrees = 180 / Math.PI;
  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose_default(a4, b3, c5, d3, e6, f3) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a4 * a4 + b3 * b3)) a4 /= scaleX, b3 /= scaleX;
    if (skewX = a4 * c5 + b3 * d3) c5 -= a4 * skewX, d3 -= b3 * skewX;
    if (scaleY = Math.sqrt(c5 * c5 + d3 * d3)) c5 /= scaleY, d3 /= scaleY, skewX /= scaleY;
    if (a4 * d3 < b3 * c5) a4 = -a4, b3 = -b3, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e6,
      translateY: f3,
      rotate: Math.atan2(b3, a4) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX,
      scaleY
    };
  }

  // node_modules/d3-interpolate/src/transform/parse.js
  var svgNode;
  function parseCss(value) {
    const m2 = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m2.isIdentity ? identity : decompose_default(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f);
  }
  function parseSvg(value) {
    if (value == null) return identity;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
    value = value.matrix;
    return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  // node_modules/d3-interpolate/src/transform/index.js
  function interpolateTransform(parse, pxComma, pxParen, degParen) {
    function pop(s5) {
      return s5.length ? s5.pop() + " " : "";
    }
    function translate(xa, ya, xb, yb, s5, q) {
      if (xa !== xb || ya !== yb) {
        var i7 = s5.push("translate(", null, pxComma, null, pxParen);
        q.push({ i: i7 - 4, x: number_default(xa, xb) }, { i: i7 - 2, x: number_default(ya, yb) });
      } else if (xb || yb) {
        s5.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }
    function rotate(a4, b3, s5, q) {
      if (a4 !== b3) {
        if (a4 - b3 > 180) b3 += 360;
        else if (b3 - a4 > 180) a4 += 360;
        q.push({ i: s5.push(pop(s5) + "rotate(", null, degParen) - 2, x: number_default(a4, b3) });
      } else if (b3) {
        s5.push(pop(s5) + "rotate(" + b3 + degParen);
      }
    }
    function skewX(a4, b3, s5, q) {
      if (a4 !== b3) {
        q.push({ i: s5.push(pop(s5) + "skewX(", null, degParen) - 2, x: number_default(a4, b3) });
      } else if (b3) {
        s5.push(pop(s5) + "skewX(" + b3 + degParen);
      }
    }
    function scale(xa, ya, xb, yb, s5, q) {
      if (xa !== xb || ya !== yb) {
        var i7 = s5.push(pop(s5) + "scale(", null, ",", null, ")");
        q.push({ i: i7 - 4, x: number_default(xa, xb) }, { i: i7 - 2, x: number_default(ya, yb) });
      } else if (xb !== 1 || yb !== 1) {
        s5.push(pop(s5) + "scale(" + xb + "," + yb + ")");
      }
    }
    return function(a4, b3) {
      var s5 = [], q = [];
      a4 = parse(a4), b3 = parse(b3);
      translate(a4.translateX, a4.translateY, b3.translateX, b3.translateY, s5, q);
      rotate(a4.rotate, b3.rotate, s5, q);
      skewX(a4.skewX, b3.skewX, s5, q);
      scale(a4.scaleX, a4.scaleY, b3.scaleX, b3.scaleY, s5, q);
      a4 = b3 = null;
      return function(t5) {
        var i7 = -1, n7 = q.length, o8;
        while (++i7 < n7) s5[(o8 = q[i7]).i] = o8.x(t5);
        return s5.join("");
      };
    };
  }
  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  // node_modules/d3-interpolate/src/zoom.js
  var epsilon2 = 1e-12;
  function cosh(x2) {
    return ((x2 = Math.exp(x2)) + 1 / x2) / 2;
  }
  function sinh(x2) {
    return ((x2 = Math.exp(x2)) - 1 / x2) / 2;
  }
  function tanh(x2) {
    return ((x2 = Math.exp(2 * x2)) - 1) / (x2 + 1);
  }
  var zoom_default = (function zoomRho(rho, rho2, rho4) {
    function zoom(p0, p1) {
      var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2], dx = ux1 - ux0, dy = uy1 - uy0, d22 = dx * dx + dy * dy, i7, S3;
      if (d22 < epsilon2) {
        S3 = Math.log(w1 / w0) / rho;
        i7 = function(t5) {
          return [
            ux0 + t5 * dx,
            uy0 + t5 * dy,
            w0 * Math.exp(rho * t5 * S3)
          ];
        };
      } else {
        var d1 = Math.sqrt(d22), b0 = (w1 * w1 - w0 * w0 + rho4 * d22) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d22) / (2 * w1 * rho2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
        S3 = (r1 - r0) / rho;
        i7 = function(t5) {
          var s5 = t5 * S3, coshr0 = cosh(r0), u4 = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s5 + r0) - sinh(r0));
          return [
            ux0 + u4 * dx,
            uy0 + u4 * dy,
            w0 * coshr0 / cosh(rho * s5 + r0)
          ];
        };
      }
      i7.duration = S3 * 1e3 * rho / Math.SQRT2;
      return i7;
    }
    zoom.rho = function(_2) {
      var _1 = Math.max(1e-3, +_2), _22 = _1 * _1, _4 = _22 * _22;
      return zoomRho(_1, _22, _4);
    };
    return zoom;
  })(Math.SQRT2, 2, 4);

  // node_modules/d3-timer/src/timer.js
  var frame = 0;
  var timeout = 0;
  var interval = 0;
  var pokeDelay = 1e3;
  var taskHead;
  var taskTail;
  var clockLast = 0;
  var clockNow = 0;
  var clockSkew = 0;
  var clock = typeof performance === "object" && performance.now ? performance : Date;
  var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f3) {
    setTimeout(f3, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }
  function clearNow() {
    clockNow = 0;
  }
  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback, delay, time) {
    var t5 = new Timer();
    t5.restart(callback, delay, time);
    return t5;
  }
  function timerFlush() {
    now();
    ++frame;
    var t5 = taskHead, e6;
    while (t5) {
      if ((e6 = clockNow - t5._time) >= 0) t5._call.call(void 0, e6);
      t5 = t5._next;
    }
    --frame;
  }
  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }
  function poke() {
    var now2 = clock.now(), delay = now2 - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
  }
  function nap() {
    var t0, t1 = taskHead, t22, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t22 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t22 : taskHead = t22;
      }
    }
    taskTail = t0;
    sleep(time);
  }
  function sleep(time) {
    if (frame) return;
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow;
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  // node_modules/d3-timer/src/timeout.js
  function timeout_default(callback, delay, time) {
    var t5 = new Timer();
    delay = delay == null ? 0 : +delay;
    t5.restart((elapsed) => {
      t5.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t5;
  }

  // node_modules/d3-transition/src/transition/schedule.js
  var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule_default(node, name, id2, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id2 in schedules) return;
    create(node, id2, {
      name,
      index,
      // For context during callback.
      group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }
  function set2(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }
  function get2(node, id2) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
    return schedule;
  }
  function create(node, id2, self) {
    var schedules = node.__transition, tween;
    schedules[id2] = self;
    self.timer = timer(schedule, 0, self.time);
    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start2, self.delay, self.time);
      if (self.delay <= elapsed) start2(elapsed - self.delay);
    }
    function start2(elapsed) {
      var i7, j, n7, o8;
      if (self.state !== SCHEDULED) return stop();
      for (i7 in schedules) {
        o8 = schedules[i7];
        if (o8.name !== self.name) continue;
        if (o8.state === STARTED) return timeout_default(start2);
        if (o8.state === RUNNING) {
          o8.state = ENDED;
          o8.timer.stop();
          o8.on.call("interrupt", node, node.__data__, o8.index, o8.group);
          delete schedules[i7];
        } else if (+i7 < id2) {
          o8.state = ENDED;
          o8.timer.stop();
          o8.on.call("cancel", node, node.__data__, o8.index, o8.group);
          delete schedules[i7];
        }
      }
      timeout_default(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return;
      self.state = STARTED;
      tween = new Array(n7 = self.tween.length);
      for (i7 = 0, j = -1; i7 < n7; ++i7) {
        if (o8 = self.tween[i7].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o8;
        }
      }
      tween.length = j + 1;
    }
    function tick(elapsed) {
      var t5 = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i7 = -1, n7 = tween.length;
      while (++i7 < n7) {
        tween[i7].call(node, t5);
      }
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }
    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id2];
      for (var i7 in schedules) return;
      delete node.__transition;
    }
  }

  // node_modules/d3-transition/src/interrupt.js
  function interrupt_default(node, name) {
    var schedules = node.__transition, schedule, active, empty2 = true, i7;
    if (!schedules) return;
    name = name == null ? null : name + "";
    for (i7 in schedules) {
      if ((schedule = schedules[i7]).name !== name) {
        empty2 = false;
        continue;
      }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i7];
    }
    if (empty2) delete node.__transition;
  }

  // node_modules/d3-transition/src/selection/interrupt.js
  function interrupt_default2(name) {
    return this.each(function() {
      interrupt_default(this, name);
    });
  }

  // node_modules/d3-transition/src/transition/tween.js
  function tweenRemove(id2, name) {
    var tween0, tween1;
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i7 = 0, n7 = tween1.length; i7 < n7; ++i7) {
          if (tween1[i7].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i7, 1);
            break;
          }
        }
      }
      schedule.tween = tween1;
    };
  }
  function tweenFunction(id2, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error();
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t5 = { name, value }, i7 = 0, n7 = tween1.length; i7 < n7; ++i7) {
          if (tween1[i7].name === name) {
            tween1[i7] = t5;
            break;
          }
        }
        if (i7 === n7) tween1.push(t5);
      }
      schedule.tween = tween1;
    };
  }
  function tween_default(name, value) {
    var id2 = this._id;
    name += "";
    if (arguments.length < 2) {
      var tween = get2(this.node(), id2).tween;
      for (var i7 = 0, n7 = tween.length, t5; i7 < n7; ++i7) {
        if ((t5 = tween[i7]).name === name) {
          return t5.value;
        }
      }
      return null;
    }
    return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
  }
  function tweenValue(transition2, name, value) {
    var id2 = transition2._id;
    transition2.each(function() {
      var schedule = set2(this, id2);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });
    return function(node) {
      return get2(node, id2).value[name];
    };
  }

  // node_modules/d3-transition/src/transition/interpolate.js
  function interpolate_default(a4, b3) {
    var c5;
    return (typeof b3 === "number" ? number_default : b3 instanceof color ? rgb_default : (c5 = color(b3)) ? (b3 = c5, rgb_default) : string_default)(a4, b3);
  }

  // node_modules/d3-transition/src/transition/attr.js
  function attrRemove2(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrConstantNS2(fullname, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attrFunctionNS2(fullname, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attr_default2(name, value) {
    var fullname = namespace_default(name), i7 = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
    return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i7, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i7, value));
  }

  // node_modules/d3-transition/src/transition/attrTween.js
  function attrInterpolate(name, i7) {
    return function(t5) {
      this.setAttribute(name, i7.call(this, t5));
    };
  }
  function attrInterpolateNS(fullname, i7) {
    return function(t5) {
      this.setAttributeNS(fullname.space, fullname.local, i7.call(this, t5));
    };
  }
  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i7 = value.apply(this, arguments);
      if (i7 !== i0) t0 = (i0 = i7) && attrInterpolateNS(fullname, i7);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i7 = value.apply(this, arguments);
      if (i7 !== i0) t0 = (i0 = i7) && attrInterpolate(name, i7);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween_default(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    var fullname = namespace_default(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  // node_modules/d3-transition/src/transition/delay.js
  function delayFunction(id2, value) {
    return function() {
      init(this, id2).delay = +value.apply(this, arguments);
    };
  }
  function delayConstant(id2, value) {
    return value = +value, function() {
      init(this, id2).delay = value;
    };
  }
  function delay_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
  }

  // node_modules/d3-transition/src/transition/duration.js
  function durationFunction(id2, value) {
    return function() {
      set2(this, id2).duration = +value.apply(this, arguments);
    };
  }
  function durationConstant(id2, value) {
    return value = +value, function() {
      set2(this, id2).duration = value;
    };
  }
  function duration_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
  }

  // node_modules/d3-transition/src/transition/ease.js
  function easeConstant(id2, value) {
    if (typeof value !== "function") throw new Error();
    return function() {
      set2(this, id2).ease = value;
    };
  }
  function ease_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
  }

  // node_modules/d3-transition/src/transition/easeVarying.js
  function easeVarying(id2, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (typeof v2 !== "function") throw new Error();
      set2(this, id2).ease = v2;
    };
  }
  function easeVarying_default(value) {
    if (typeof value !== "function") throw new Error();
    return this.each(easeVarying(this._id, value));
  }

  // node_modules/d3-transition/src/transition/filter.js
  function filter_default2(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, subgroup = subgroups[j] = [], node, i7 = 0; i7 < n7; ++i7) {
        if ((node = group[i7]) && match.call(node, node.__data__, i7, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/merge.js
  function merge_default2(transition2) {
    if (transition2._id !== this._id) throw new Error();
    for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n7 = group0.length, merge = merges[j] = new Array(n7), node, i7 = 0; i7 < n7; ++i7) {
        if (node = group0[i7] || group1[i7]) {
          merge[i7] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Transition(merges, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/on.js
  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t5) {
      var i7 = t5.indexOf(".");
      if (i7 >= 0) t5 = t5.slice(0, i7);
      return !t5 || t5 === "start";
    });
  }
  function onFunction(id2, name, listener) {
    var on0, on1, sit = start(name) ? init : set2;
    return function() {
      var schedule = sit(this, id2), on = schedule.on;
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
      schedule.on = on1;
    };
  }
  function on_default2(name, listener) {
    var id2 = this._id;
    return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
  }

  // node_modules/d3-transition/src/transition/remove.js
  function removeFunction(id2) {
    return function() {
      var parent = this.parentNode;
      for (var i7 in this.__transition) if (+i7 !== id2) return;
      if (parent) parent.removeChild(this);
    };
  }
  function remove_default2() {
    return this.on("end.remove", removeFunction(this._id));
  }

  // node_modules/d3-transition/src/transition/select.js
  function select_default3(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, subgroup = subgroups[j] = new Array(n7), node, subnode, i7 = 0; i7 < n7; ++i7) {
        if ((node = group[i7]) && (subnode = select.call(node, node.__data__, i7, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i7] = subnode;
          schedule_default(subgroup[i7], name, id2, i7, subgroup, get2(node, id2));
        }
      }
    }
    return new Transition(subgroups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selectAll.js
  function selectAll_default2(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selectorAll_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, node, i7 = 0; i7 < n7; ++i7) {
        if (node = group[i7]) {
          for (var children2 = select.call(node, node.__data__, i7, group), child, inherit2 = get2(node, id2), k2 = 0, l4 = children2.length; k2 < l4; ++k2) {
            if (child = children2[k2]) {
              schedule_default(child, name, id2, k2, children2, inherit2);
            }
          }
          subgroups.push(children2);
          parents.push(node);
        }
      }
    }
    return new Transition(subgroups, parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selection.js
  var Selection2 = selection_default.prototype.constructor;
  function selection_default2() {
    return new Selection2(this._groups, this._parents);
  }

  // node_modules/d3-transition/src/transition/style.js
  function styleNull(name, interpolate) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }
  function styleRemove2(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function styleFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function styleMaybeRemove(id2, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
    return function() {
      var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }
  function style_default2(name, value, priority) {
    var i7 = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
    return value == null ? this.styleTween(name, styleNull(name, i7)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i7, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i7, value), priority).on("end.style." + name, null);
  }

  // node_modules/d3-transition/src/transition/styleTween.js
  function styleInterpolate(name, i7, priority) {
    return function(t5) {
      this.style.setProperty(name, i7.call(this, t5), priority);
    };
  }
  function styleTween(name, value, priority) {
    var t5, i0;
    function tween() {
      var i7 = value.apply(this, arguments);
      if (i7 !== i0) t5 = (i0 = i7) && styleInterpolate(name, i7, priority);
      return t5;
    }
    tween._value = value;
    return tween;
  }
  function styleTween_default(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  // node_modules/d3-transition/src/transition/text.js
  function textConstant2(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction2(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }
  function text_default2(value) {
    return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
  }

  // node_modules/d3-transition/src/transition/textTween.js
  function textInterpolate(i7) {
    return function(t5) {
      this.textContent = i7.call(this, t5);
    };
  }
  function textTween(value) {
    var t0, i0;
    function tween() {
      var i7 = value.apply(this, arguments);
      if (i7 !== i0) t0 = (i0 = i7) && textInterpolate(i7);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function textTween_default(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, textTween(value));
  }

  // node_modules/d3-transition/src/transition/transition.js
  function transition_default() {
    var name = this._name, id0 = this._id, id1 = newId();
    for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, node, i7 = 0; i7 < n7; ++i7) {
        if (node = group[i7]) {
          var inherit2 = get2(node, id0);
          schedule_default(node, name, id1, i7, group, {
            time: inherit2.time + inherit2.delay + inherit2.duration,
            delay: 0,
            duration: inherit2.duration,
            ease: inherit2.ease
          });
        }
      }
    }
    return new Transition(groups, this._parents, name, id1);
  }

  // node_modules/d3-transition/src/transition/end.js
  function end_default() {
    var on0, on1, that = this, id2 = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = { value: reject }, end = { value: function() {
        if (--size === 0) resolve();
      } };
      that.each(function() {
        var schedule = set2(this, id2), on = schedule.on;
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }
        schedule.on = on1;
      });
      if (size === 0) resolve();
    });
  }

  // node_modules/d3-transition/src/transition/index.js
  var id = 0;
  function Transition(groups, parents, name, id2) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id2;
  }
  function transition(name) {
    return selection_default().transition(name);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection_default.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: select_default3,
    selectAll: selectAll_default2,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: filter_default2,
    merge: merge_default2,
    selection: selection_default2,
    transition: transition_default,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: on_default2,
    attr: attr_default2,
    attrTween: attrTween_default,
    style: style_default2,
    styleTween: styleTween_default,
    text: text_default2,
    textTween: textTween_default,
    remove: remove_default2,
    tween: tween_default,
    delay: delay_default,
    duration: duration_default,
    ease: ease_default,
    easeVarying: easeVarying_default,
    end: end_default,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  // node_modules/d3-ease/src/cubic.js
  function cubicInOut(t5) {
    return ((t5 *= 2) <= 1 ? t5 * t5 * t5 : (t5 -= 2) * t5 * t5 + 2) / 2;
  }

  // node_modules/d3-transition/src/selection/transition.js
  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };
  function inherit(node, id2) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id2])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id2} not found`);
      }
    }
    return timing;
  }
  function transition_default2(name) {
    var id2, timing;
    if (name instanceof Transition) {
      id2 = name._id, name = name._name;
    } else {
      id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }
    for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
      for (var group = groups[j], n7 = group.length, node, i7 = 0; i7 < n7; ++i7) {
        if (node = group[i7]) {
          schedule_default(node, name, id2, i7, group, timing || inherit(node, id2));
        }
      }
    }
    return new Transition(groups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/selection/index.js
  selection_default.prototype.interrupt = interrupt_default2;
  selection_default.prototype.transition = transition_default2;

  // node_modules/d3-zoom/src/constant.js
  var constant_default3 = (x2) => () => x2;

  // node_modules/d3-zoom/src/event.js
  function ZoomEvent(type, {
    sourceEvent,
    target,
    transform: transform2,
    dispatch: dispatch2
  }) {
    Object.defineProperties(this, {
      type: { value: type, enumerable: true, configurable: true },
      sourceEvent: { value: sourceEvent, enumerable: true, configurable: true },
      target: { value: target, enumerable: true, configurable: true },
      transform: { value: transform2, enumerable: true, configurable: true },
      _: { value: dispatch2 }
    });
  }

  // node_modules/d3-zoom/src/transform.js
  function Transform(k2, x2, y3) {
    this.k = k2;
    this.x = x2;
    this.y = y3;
  }
  Transform.prototype = {
    constructor: Transform,
    scale: function(k2) {
      return k2 === 1 ? this : new Transform(this.k * k2, this.x, this.y);
    },
    translate: function(x2, y3) {
      return x2 === 0 & y3 === 0 ? this : new Transform(this.k, this.x + this.k * x2, this.y + this.k * y3);
    },
    apply: function(point) {
      return [point[0] * this.k + this.x, point[1] * this.k + this.y];
    },
    applyX: function(x2) {
      return x2 * this.k + this.x;
    },
    applyY: function(y3) {
      return y3 * this.k + this.y;
    },
    invert: function(location) {
      return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
    },
    invertX: function(x2) {
      return (x2 - this.x) / this.k;
    },
    invertY: function(y3) {
      return (y3 - this.y) / this.k;
    },
    rescaleX: function(x2) {
      return x2.copy().domain(x2.range().map(this.invertX, this).map(x2.invert, x2));
    },
    rescaleY: function(y3) {
      return y3.copy().domain(y3.range().map(this.invertY, this).map(y3.invert, y3));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };
  var identity2 = new Transform(1, 0, 0);
  transform.prototype = Transform.prototype;
  function transform(node) {
    while (!node.__zoom) if (!(node = node.parentNode)) return identity2;
    return node.__zoom;
  }

  // node_modules/d3-zoom/src/noevent.js
  function nopropagation(event) {
    event.stopImmediatePropagation();
  }
  function noevent_default2(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  // node_modules/d3-zoom/src/zoom.js
  function defaultFilter(event) {
    return (!event.ctrlKey || event.type === "wheel") && !event.button;
  }
  function defaultExtent() {
    var e6 = this;
    if (e6 instanceof SVGElement) {
      e6 = e6.ownerSVGElement || e6;
      if (e6.hasAttribute("viewBox")) {
        e6 = e6.viewBox.baseVal;
        return [[e6.x, e6.y], [e6.x + e6.width, e6.y + e6.height]];
      }
      return [[0, 0], [e6.width.baseVal.value, e6.height.baseVal.value]];
    }
    return [[0, 0], [e6.clientWidth, e6.clientHeight]];
  }
  function defaultTransform() {
    return this.__zoom || identity2;
  }
  function defaultWheelDelta(event) {
    return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 2e-3) * (event.ctrlKey ? 10 : 1);
  }
  function defaultTouchable() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function defaultConstrain(transform2, extent, translateExtent) {
    var dx0 = transform2.invertX(extent[0][0]) - translateExtent[0][0], dx1 = transform2.invertX(extent[1][0]) - translateExtent[1][0], dy0 = transform2.invertY(extent[0][1]) - translateExtent[0][1], dy1 = transform2.invertY(extent[1][1]) - translateExtent[1][1];
    return transform2.translate(
      dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
      dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
    );
  }
  function zoom_default2() {
    var filter2 = defaultFilter, extent = defaultExtent, constrain = defaultConstrain, wheelDelta2 = defaultWheelDelta, touchable = defaultTouchable, scaleExtent = [0, Infinity], translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]], duration = 250, interpolate = zoom_default, listeners = dispatch_default("start", "zoom", "end"), touchstarting, touchfirst, touchending, touchDelay = 500, wheelDelay = 150, clickDistance2 = 0, tapDistance = 10;
    function zoom(selection2) {
      selection2.property("__zoom", defaultTransform).on("wheel.zoom", wheeled, { passive: false }).on("mousedown.zoom", mousedowned).on("dblclick.zoom", dblclicked).filter(touchable).on("touchstart.zoom", touchstarted).on("touchmove.zoom", touchmoved).on("touchend.zoom touchcancel.zoom", touchended).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    zoom.transform = function(collection, transform2, point, event) {
      var selection2 = collection.selection ? collection.selection() : collection;
      selection2.property("__zoom", defaultTransform);
      if (collection !== selection2) {
        schedule(collection, transform2, point, event);
      } else {
        selection2.interrupt().each(function() {
          gesture(this, arguments).event(event).start().zoom(null, typeof transform2 === "function" ? transform2.apply(this, arguments) : transform2).end();
        });
      }
    };
    zoom.scaleBy = function(selection2, k2, p3, event) {
      zoom.scaleTo(selection2, function() {
        var k0 = this.__zoom.k, k1 = typeof k2 === "function" ? k2.apply(this, arguments) : k2;
        return k0 * k1;
      }, p3, event);
    };
    zoom.scaleTo = function(selection2, k2, p3, event) {
      zoom.transform(selection2, function() {
        var e6 = extent.apply(this, arguments), t0 = this.__zoom, p0 = p3 == null ? centroid(e6) : typeof p3 === "function" ? p3.apply(this, arguments) : p3, p1 = t0.invert(p0), k1 = typeof k2 === "function" ? k2.apply(this, arguments) : k2;
        return constrain(translate(scale(t0, k1), p0, p1), e6, translateExtent);
      }, p3, event);
    };
    zoom.translateBy = function(selection2, x2, y3, event) {
      zoom.transform(selection2, function() {
        return constrain(this.__zoom.translate(
          typeof x2 === "function" ? x2.apply(this, arguments) : x2,
          typeof y3 === "function" ? y3.apply(this, arguments) : y3
        ), extent.apply(this, arguments), translateExtent);
      }, null, event);
    };
    zoom.translateTo = function(selection2, x2, y3, p3, event) {
      zoom.transform(selection2, function() {
        var e6 = extent.apply(this, arguments), t5 = this.__zoom, p0 = p3 == null ? centroid(e6) : typeof p3 === "function" ? p3.apply(this, arguments) : p3;
        return constrain(identity2.translate(p0[0], p0[1]).scale(t5.k).translate(
          typeof x2 === "function" ? -x2.apply(this, arguments) : -x2,
          typeof y3 === "function" ? -y3.apply(this, arguments) : -y3
        ), e6, translateExtent);
      }, p3, event);
    };
    function scale(transform2, k2) {
      k2 = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k2));
      return k2 === transform2.k ? transform2 : new Transform(k2, transform2.x, transform2.y);
    }
    function translate(transform2, p0, p1) {
      var x2 = p0[0] - p1[0] * transform2.k, y3 = p0[1] - p1[1] * transform2.k;
      return x2 === transform2.x && y3 === transform2.y ? transform2 : new Transform(transform2.k, x2, y3);
    }
    function centroid(extent2) {
      return [(+extent2[0][0] + +extent2[1][0]) / 2, (+extent2[0][1] + +extent2[1][1]) / 2];
    }
    function schedule(transition2, transform2, point, event) {
      transition2.on("start.zoom", function() {
        gesture(this, arguments).event(event).start();
      }).on("interrupt.zoom end.zoom", function() {
        gesture(this, arguments).event(event).end();
      }).tween("zoom", function() {
        var that = this, args = arguments, g2 = gesture(that, args).event(event), e6 = extent.apply(that, args), p3 = point == null ? centroid(e6) : typeof point === "function" ? point.apply(that, args) : point, w2 = Math.max(e6[1][0] - e6[0][0], e6[1][1] - e6[0][1]), a4 = that.__zoom, b3 = typeof transform2 === "function" ? transform2.apply(that, args) : transform2, i7 = interpolate(a4.invert(p3).concat(w2 / a4.k), b3.invert(p3).concat(w2 / b3.k));
        return function(t5) {
          if (t5 === 1) t5 = b3;
          else {
            var l4 = i7(t5), k2 = w2 / l4[2];
            t5 = new Transform(k2, p3[0] - l4[0] * k2, p3[1] - l4[1] * k2);
          }
          g2.zoom(null, t5);
        };
      });
    }
    function gesture(that, args, clean) {
      return !clean && that.__zooming || new Gesture(that, args);
    }
    function Gesture(that, args) {
      this.that = that;
      this.args = args;
      this.active = 0;
      this.sourceEvent = null;
      this.extent = extent.apply(that, args);
      this.taps = 0;
    }
    Gesture.prototype = {
      event: function(event) {
        if (event) this.sourceEvent = event;
        return this;
      },
      start: function() {
        if (++this.active === 1) {
          this.that.__zooming = this;
          this.emit("start");
        }
        return this;
      },
      zoom: function(key, transform2) {
        if (this.mouse && key !== "mouse") this.mouse[1] = transform2.invert(this.mouse[0]);
        if (this.touch0 && key !== "touch") this.touch0[1] = transform2.invert(this.touch0[0]);
        if (this.touch1 && key !== "touch") this.touch1[1] = transform2.invert(this.touch1[0]);
        this.that.__zoom = transform2;
        this.emit("zoom");
        return this;
      },
      end: function() {
        if (--this.active === 0) {
          delete this.that.__zooming;
          this.emit("end");
        }
        return this;
      },
      emit: function(type) {
        var d3 = select_default2(this.that).datum();
        listeners.call(
          type,
          this.that,
          new ZoomEvent(type, {
            sourceEvent: this.sourceEvent,
            target: zoom,
            type,
            transform: this.that.__zoom,
            dispatch: listeners
          }),
          d3
        );
      }
    };
    function wheeled(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var g2 = gesture(this, args).event(event), t5 = this.__zoom, k2 = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t5.k * Math.pow(2, wheelDelta2.apply(this, arguments)))), p3 = pointer_default(event);
      if (g2.wheel) {
        if (g2.mouse[0][0] !== p3[0] || g2.mouse[0][1] !== p3[1]) {
          g2.mouse[1] = t5.invert(g2.mouse[0] = p3);
        }
        clearTimeout(g2.wheel);
      } else if (t5.k === k2) return;
      else {
        g2.mouse = [p3, t5.invert(p3)];
        interrupt_default(this);
        g2.start();
      }
      noevent_default2(event);
      g2.wheel = setTimeout(wheelidled, wheelDelay);
      g2.zoom("mouse", constrain(translate(scale(t5, k2), g2.mouse[0], g2.mouse[1]), g2.extent, translateExtent));
      function wheelidled() {
        g2.wheel = null;
        g2.end();
      }
    }
    function mousedowned(event, ...args) {
      if (touchending || !filter2.apply(this, arguments)) return;
      var currentTarget = event.currentTarget, g2 = gesture(this, args, true).event(event), v2 = select_default2(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true), p3 = pointer_default(event, currentTarget), x0 = event.clientX, y0 = event.clientY;
      nodrag_default(event.view);
      nopropagation(event);
      g2.mouse = [p3, this.__zoom.invert(p3)];
      interrupt_default(this);
      g2.start();
      function mousemoved(event2) {
        noevent_default2(event2);
        if (!g2.moved) {
          var dx = event2.clientX - x0, dy = event2.clientY - y0;
          g2.moved = dx * dx + dy * dy > clickDistance2;
        }
        g2.event(event2).zoom("mouse", constrain(translate(g2.that.__zoom, g2.mouse[0] = pointer_default(event2, currentTarget), g2.mouse[1]), g2.extent, translateExtent));
      }
      function mouseupped(event2) {
        v2.on("mousemove.zoom mouseup.zoom", null);
        yesdrag(event2.view, g2.moved);
        noevent_default2(event2);
        g2.event(event2).end();
      }
    }
    function dblclicked(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var t0 = this.__zoom, p0 = pointer_default(event.changedTouches ? event.changedTouches[0] : event, this), p1 = t0.invert(p0), k1 = t0.k * (event.shiftKey ? 0.5 : 2), t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, args), translateExtent);
      noevent_default2(event);
      if (duration > 0) select_default2(this).transition().duration(duration).call(schedule, t1, p0, event);
      else select_default2(this).call(zoom.transform, t1, p0, event);
    }
    function touchstarted(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var touches = event.touches, n7 = touches.length, g2 = gesture(this, args, event.changedTouches.length === n7).event(event), started, i7, t5, p3;
      nopropagation(event);
      for (i7 = 0; i7 < n7; ++i7) {
        t5 = touches[i7], p3 = pointer_default(t5, this);
        p3 = [p3, this.__zoom.invert(p3), t5.identifier];
        if (!g2.touch0) g2.touch0 = p3, started = true, g2.taps = 1 + !!touchstarting;
        else if (!g2.touch1 && g2.touch0[2] !== p3[2]) g2.touch1 = p3, g2.taps = 0;
      }
      if (touchstarting) touchstarting = clearTimeout(touchstarting);
      if (started) {
        if (g2.taps < 2) touchfirst = p3[0], touchstarting = setTimeout(function() {
          touchstarting = null;
        }, touchDelay);
        interrupt_default(this);
        g2.start();
      }
    }
    function touchmoved(event, ...args) {
      if (!this.__zooming) return;
      var g2 = gesture(this, args).event(event), touches = event.changedTouches, n7 = touches.length, i7, t5, p3, l4;
      noevent_default2(event);
      for (i7 = 0; i7 < n7; ++i7) {
        t5 = touches[i7], p3 = pointer_default(t5, this);
        if (g2.touch0 && g2.touch0[2] === t5.identifier) g2.touch0[0] = p3;
        else if (g2.touch1 && g2.touch1[2] === t5.identifier) g2.touch1[0] = p3;
      }
      t5 = g2.that.__zoom;
      if (g2.touch1) {
        var p0 = g2.touch0[0], l0 = g2.touch0[1], p1 = g2.touch1[0], l1 = g2.touch1[1], dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp, dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
        t5 = scale(t5, Math.sqrt(dp / dl));
        p3 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        l4 = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
      } else if (g2.touch0) p3 = g2.touch0[0], l4 = g2.touch0[1];
      else return;
      g2.zoom("touch", constrain(translate(t5, p3, l4), g2.extent, translateExtent));
    }
    function touchended(event, ...args) {
      if (!this.__zooming) return;
      var g2 = gesture(this, args).event(event), touches = event.changedTouches, n7 = touches.length, i7, t5;
      nopropagation(event);
      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() {
        touchending = null;
      }, touchDelay);
      for (i7 = 0; i7 < n7; ++i7) {
        t5 = touches[i7];
        if (g2.touch0 && g2.touch0[2] === t5.identifier) delete g2.touch0;
        else if (g2.touch1 && g2.touch1[2] === t5.identifier) delete g2.touch1;
      }
      if (g2.touch1 && !g2.touch0) g2.touch0 = g2.touch1, delete g2.touch1;
      if (g2.touch0) g2.touch0[1] = this.__zoom.invert(g2.touch0[0]);
      else {
        g2.end();
        if (g2.taps === 2) {
          t5 = pointer_default(t5, this);
          if (Math.hypot(touchfirst[0] - t5[0], touchfirst[1] - t5[1]) < tapDistance) {
            var p3 = select_default2(this).on("dblclick.zoom");
            if (p3) p3.apply(this, arguments);
          }
        }
      }
    }
    zoom.wheelDelta = function(_2) {
      return arguments.length ? (wheelDelta2 = typeof _2 === "function" ? _2 : constant_default3(+_2), zoom) : wheelDelta2;
    };
    zoom.filter = function(_2) {
      return arguments.length ? (filter2 = typeof _2 === "function" ? _2 : constant_default3(!!_2), zoom) : filter2;
    };
    zoom.touchable = function(_2) {
      return arguments.length ? (touchable = typeof _2 === "function" ? _2 : constant_default3(!!_2), zoom) : touchable;
    };
    zoom.extent = function(_2) {
      return arguments.length ? (extent = typeof _2 === "function" ? _2 : constant_default3([[+_2[0][0], +_2[0][1]], [+_2[1][0], +_2[1][1]]]), zoom) : extent;
    };
    zoom.scaleExtent = function(_2) {
      return arguments.length ? (scaleExtent[0] = +_2[0], scaleExtent[1] = +_2[1], zoom) : [scaleExtent[0], scaleExtent[1]];
    };
    zoom.translateExtent = function(_2) {
      return arguments.length ? (translateExtent[0][0] = +_2[0][0], translateExtent[1][0] = +_2[1][0], translateExtent[0][1] = +_2[0][1], translateExtent[1][1] = +_2[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
    };
    zoom.constrain = function(_2) {
      return arguments.length ? (constrain = _2, zoom) : constrain;
    };
    zoom.duration = function(_2) {
      return arguments.length ? (duration = +_2, zoom) : duration;
    };
    zoom.interpolate = function(_2) {
      return arguments.length ? (interpolate = _2, zoom) : interpolate;
    };
    zoom.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? zoom : value;
    };
    zoom.clickDistance = function(_2) {
      return arguments.length ? (clickDistance2 = (_2 = +_2) * _2, zoom) : Math.sqrt(clickDistance2);
    };
    zoom.tapDistance = function(_2) {
      return arguments.length ? (tapDistance = +_2, zoom) : tapDistance;
    };
    return zoom;
  }

  // node_modules/lit-flow/node_modules/@xyflow/system/dist/esm/index.js
  var infiniteExtent = [
    [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  ];
  var ConnectionMode;
  (function(ConnectionMode2) {
    ConnectionMode2["Strict"] = "strict";
    ConnectionMode2["Loose"] = "loose";
  })(ConnectionMode || (ConnectionMode = {}));
  var PanOnScrollMode;
  (function(PanOnScrollMode2) {
    PanOnScrollMode2["Free"] = "free";
    PanOnScrollMode2["Vertical"] = "vertical";
    PanOnScrollMode2["Horizontal"] = "horizontal";
  })(PanOnScrollMode || (PanOnScrollMode = {}));
  var SelectionMode;
  (function(SelectionMode2) {
    SelectionMode2["Partial"] = "partial";
    SelectionMode2["Full"] = "full";
  })(SelectionMode || (SelectionMode = {}));
  var ConnectionLineType;
  (function(ConnectionLineType2) {
    ConnectionLineType2["Bezier"] = "default";
    ConnectionLineType2["Straight"] = "straight";
    ConnectionLineType2["Step"] = "step";
    ConnectionLineType2["SmoothStep"] = "smoothstep";
    ConnectionLineType2["SimpleBezier"] = "simplebezier";
  })(ConnectionLineType || (ConnectionLineType = {}));
  var MarkerType;
  (function(MarkerType2) {
    MarkerType2["Arrow"] = "arrow";
    MarkerType2["ArrowClosed"] = "arrowclosed";
  })(MarkerType || (MarkerType = {}));
  var Position;
  (function(Position2) {
    Position2["Left"] = "left";
    Position2["Top"] = "top";
    Position2["Right"] = "right";
    Position2["Bottom"] = "bottom";
  })(Position || (Position = {}));
  var oppositePosition = {
    [Position.Left]: Position.Right,
    [Position.Right]: Position.Left,
    [Position.Top]: Position.Bottom,
    [Position.Bottom]: Position.Top
  };
  var clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
  var isNumeric = (n7) => !isNaN(n7) && isFinite(n7);
  var isMacOs = () => typeof navigator !== "undefined" && navigator?.userAgent?.indexOf("Mac") >= 0;
  function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY, sourceControlX, sourceControlY, targetControlX, targetControlY }) {
    const centerX = sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + targetX * 0.125;
    const centerY = sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + targetY * 0.125;
    const offsetX = Math.abs(centerX - sourceX);
    const offsetY = Math.abs(centerY - sourceY);
    return [centerX, centerY, offsetX, offsetY];
  }
  function calculateControlOffset(distance2, curvature) {
    if (distance2 >= 0) {
      return 0.5 * distance2;
    }
    return curvature * 25 * Math.sqrt(-distance2);
  }
  function getControlWithCurvature({ pos, x1, y1, x2, y2: y22, c: c5 }) {
    switch (pos) {
      case Position.Left:
        return [x1 - calculateControlOffset(x1 - x2, c5), y1];
      case Position.Right:
        return [x1 + calculateControlOffset(x2 - x1, c5), y1];
      case Position.Top:
        return [x1, y1 - calculateControlOffset(y1 - y22, c5)];
      case Position.Bottom:
        return [x1, y1 + calculateControlOffset(y22 - y1, c5)];
    }
  }
  function getBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, curvature = 0.25 }) {
    const [sourceControlX, sourceControlY] = getControlWithCurvature({
      pos: sourcePosition,
      x1: sourceX,
      y1: sourceY,
      x2: targetX,
      y2: targetY,
      c: curvature
    });
    const [targetControlX, targetControlY] = getControlWithCurvature({
      pos: targetPosition,
      x1: targetX,
      y1: targetY,
      x2: sourceX,
      y2: sourceY,
      c: curvature
    });
    const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceControlX,
      sourceControlY,
      targetControlX,
      targetControlY
    });
    return [
      `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
      labelX,
      labelY,
      offsetX,
      offsetY
    ];
  }
  function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
    const xOffset = Math.abs(targetX - sourceX) / 2;
    const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
    const yOffset = Math.abs(targetY - sourceY) / 2;
    const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;
    return [centerX, centerY, xOffset, yOffset];
  }
  function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
    const [labelX, labelY, offsetX, offsetY] = getEdgeCenter({
      sourceX,
      sourceY,
      targetX,
      targetY
    });
    return [`M ${sourceX},${sourceY}L ${targetX},${targetY}`, labelX, labelY, offsetX, offsetY];
  }
  var handleDirections = {
    [Position.Left]: { x: -1, y: 0 },
    [Position.Right]: { x: 1, y: 0 },
    [Position.Top]: { x: 0, y: -1 },
    [Position.Bottom]: { x: 0, y: 1 }
  };
  var getDirection = ({ source, sourcePosition = Position.Bottom, target }) => {
    if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
      return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
    }
    return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
  };
  var distance = (a4, b3) => Math.sqrt(Math.pow(b3.x - a4.x, 2) + Math.pow(b3.y - a4.y, 2));
  function getPoints({ source, sourcePosition = Position.Bottom, target, targetPosition = Position.Top, center, offset, stepPosition }) {
    const sourceDir = handleDirections[sourcePosition];
    const targetDir = handleDirections[targetPosition];
    const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
    const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
    const dir = getDirection({
      source: sourceGapped,
      sourcePosition,
      target: targetGapped
    });
    const dirAccessor = dir.x !== 0 ? "x" : "y";
    const currDir = dir[dirAccessor];
    let points = [];
    let centerX, centerY;
    const sourceGapOffset = { x: 0, y: 0 };
    const targetGapOffset = { x: 0, y: 0 };
    const [, , defaultOffsetX, defaultOffsetY] = getEdgeCenter({
      sourceX: source.x,
      sourceY: source.y,
      targetX: target.x,
      targetY: target.y
    });
    if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
      if (dirAccessor === "x") {
        centerX = center.x ?? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
        centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;
      } else {
        centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
        centerY = center.y ?? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
      }
      const verticalSplit = [
        { x: centerX, y: sourceGapped.y },
        { x: centerX, y: targetGapped.y }
      ];
      const horizontalSplit = [
        { x: sourceGapped.x, y: centerY },
        { x: targetGapped.x, y: centerY }
      ];
      if (sourceDir[dirAccessor] === currDir) {
        points = dirAccessor === "x" ? verticalSplit : horizontalSplit;
      } else {
        points = dirAccessor === "x" ? horizontalSplit : verticalSplit;
      }
    } else {
      const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }];
      const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }];
      if (dirAccessor === "x") {
        points = sourceDir.x === currDir ? targetSource : sourceTarget;
      } else {
        points = sourceDir.y === currDir ? sourceTarget : targetSource;
      }
      if (sourcePosition === targetPosition) {
        const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
        if (diff <= offset) {
          const gapOffset = Math.min(offset - 1, offset - diff);
          if (sourceDir[dirAccessor] === currDir) {
            sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
          } else {
            targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
          }
        }
      }
      if (sourcePosition !== targetPosition) {
        const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x";
        const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
        const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
        const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
        const flipSourceTarget = sourceDir[dirAccessor] === 1 && (!isSameDir && sourceGtTargetOppo || isSameDir && sourceLtTargetOppo) || sourceDir[dirAccessor] !== 1 && (!isSameDir && sourceLtTargetOppo || isSameDir && sourceGtTargetOppo);
        if (flipSourceTarget) {
          points = dirAccessor === "x" ? sourceTarget : targetSource;
        }
      }
      const sourceGapPoint = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y };
      const targetGapPoint = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y };
      const maxXDistance = Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x));
      const maxYDistance = Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y));
      if (maxXDistance >= maxYDistance) {
        centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
        centerY = points[0].y;
      } else {
        centerX = points[0].x;
        centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
      }
    }
    const pathPoints = [
      source,
      { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y },
      ...points,
      { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y },
      target
    ];
    return [pathPoints, centerX, centerY, defaultOffsetX, defaultOffsetY];
  }
  function getBend(a4, b3, c5, size) {
    const bendSize = Math.min(distance(a4, b3) / 2, distance(b3, c5) / 2, size);
    const { x: x2, y: y3 } = b3;
    if (a4.x === x2 && x2 === c5.x || a4.y === y3 && y3 === c5.y) {
      return `L${x2} ${y3}`;
    }
    if (a4.y === y3) {
      const xDir2 = a4.x < c5.x ? -1 : 1;
      const yDir2 = a4.y < c5.y ? 1 : -1;
      return `L ${x2 + bendSize * xDir2},${y3}Q ${x2},${y3} ${x2},${y3 + bendSize * yDir2}`;
    }
    const xDir = a4.x < c5.x ? 1 : -1;
    const yDir = a4.y < c5.y ? -1 : 1;
    return `L ${x2},${y3 + bendSize * yDir}Q ${x2},${y3} ${x2 + bendSize * xDir},${y3}`;
  }
  function getSmoothStepPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, borderRadius = 5, centerX, centerY, offset = 20, stepPosition = 0.5 }) {
    const [points, labelX, labelY, offsetX, offsetY] = getPoints({
      source: { x: sourceX, y: sourceY },
      sourcePosition,
      target: { x: targetX, y: targetY },
      targetPosition,
      center: { x: centerX, y: centerY },
      offset,
      stepPosition
    });
    const path = points.reduce((res, p3, i7) => {
      let segment = "";
      if (i7 > 0 && i7 < points.length - 1) {
        segment = getBend(points[i7 - 1], p3, points[i7 + 1], borderRadius);
      } else {
        segment = `${i7 === 0 ? "M" : "L"}${p3.x} ${p3.y}`;
      }
      res += segment;
      return res;
    }, "");
    return [path, labelX, labelY, offsetX, offsetY];
  }
  var defaultOptions = {
    nodeOrigin: [0, 0],
    nodeExtent: infiniteExtent,
    elevateNodesOnSelect: true,
    defaults: {}
  };
  var adoptUserNodesDefaultOptions = {
    ...defaultOptions,
    checkEquality: true
  };
  var viewChanged = (prevViewport, eventViewport) => prevViewport.x !== eventViewport.x || prevViewport.y !== eventViewport.y || prevViewport.zoom !== eventViewport.k;
  var transformToViewport = (transform2) => ({
    x: transform2.x,
    y: transform2.y,
    zoom: transform2.k
  });
  var viewportToTransform = ({ x: x2, y: y3, zoom }) => identity2.translate(x2, y3).scale(zoom);
  var isWrappedWithClass = (event, className) => event.target.closest(`.${className}`);
  var isRightClickPan = (panOnDrag, usedButton) => usedButton === 2 && Array.isArray(panOnDrag) && panOnDrag.includes(2);
  var defaultEase = (t5) => ((t5 *= 2) <= 1 ? t5 * t5 * t5 : (t5 -= 2) * t5 * t5 + 2) / 2;
  var getD3Transition = (selection2, duration = 0, ease = defaultEase, onEnd = () => {
  }) => {
    const hasDuration = typeof duration === "number" && duration > 0;
    if (!hasDuration) {
      onEnd();
    }
    return hasDuration ? selection2.transition().duration(duration).ease(ease).on("end", onEnd) : selection2;
  };
  var wheelDelta = (event) => {
    const factor = event.ctrlKey && isMacOs() ? 10 : 1;
    return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 2e-3) * factor;
  };
  function createPanOnScrollHandler({ zoomPanValues, noWheelClassName, d3Selection, d3Zoom, panOnScrollMode, panOnScrollSpeed, zoomOnPinch, onPanZoomStart, onPanZoom, onPanZoomEnd }) {
    return (event) => {
      if (isWrappedWithClass(event, noWheelClassName)) {
        if (event.ctrlKey) {
          event.preventDefault();
        }
        return false;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const currentZoom = d3Selection.property("__zoom").k || 1;
      if (event.ctrlKey && zoomOnPinch) {
        const point = pointer_default(event);
        const pinchDelta = wheelDelta(event);
        const zoom = currentZoom * Math.pow(2, pinchDelta);
        d3Zoom.scaleTo(d3Selection, zoom, point, event);
        return;
      }
      const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
      let deltaX = panOnScrollMode === PanOnScrollMode.Vertical ? 0 : event.deltaX * deltaNormalize;
      let deltaY = panOnScrollMode === PanOnScrollMode.Horizontal ? 0 : event.deltaY * deltaNormalize;
      if (!isMacOs() && event.shiftKey && panOnScrollMode !== PanOnScrollMode.Vertical) {
        deltaX = event.deltaY * deltaNormalize;
        deltaY = 0;
      }
      d3Zoom.translateBy(
        d3Selection,
        -(deltaX / currentZoom) * panOnScrollSpeed,
        -(deltaY / currentZoom) * panOnScrollSpeed,
        // @ts-ignore
        { internal: true }
      );
      const nextViewport = transformToViewport(d3Selection.property("__zoom"));
      clearTimeout(zoomPanValues.panScrollTimeout);
      if (!zoomPanValues.isPanScrolling) {
        zoomPanValues.isPanScrolling = true;
        onPanZoomStart?.(event, nextViewport);
      }
      if (zoomPanValues.isPanScrolling) {
        onPanZoom?.(event, nextViewport);
        zoomPanValues.panScrollTimeout = setTimeout(() => {
          onPanZoomEnd?.(event, nextViewport);
          zoomPanValues.isPanScrolling = false;
        }, 150);
      }
    };
  }
  function createZoomOnScrollHandler({ noWheelClassName, preventScrolling, d3ZoomHandler }) {
    return function(event, d3) {
      const isWheel = event.type === "wheel";
      const preventZoom = !preventScrolling && isWheel && !event.ctrlKey;
      const hasNoWheelClass = isWrappedWithClass(event, noWheelClassName);
      if (event.ctrlKey && isWheel && hasNoWheelClass) {
        event.preventDefault();
      }
      if (preventZoom || hasNoWheelClass) {
        return null;
      }
      event.preventDefault();
      d3ZoomHandler.call(this, event, d3);
    };
  }
  function createPanZoomStartHandler({ zoomPanValues, onDraggingChange, onPanZoomStart }) {
    return (event) => {
      if (event.sourceEvent?.internal) {
        return;
      }
      const viewport = transformToViewport(event.transform);
      zoomPanValues.mouseButton = event.sourceEvent?.button || 0;
      zoomPanValues.isZoomingOrPanning = true;
      zoomPanValues.prevViewport = viewport;
      if (event.sourceEvent?.type === "mousedown") {
        onDraggingChange(true);
      }
      if (onPanZoomStart) {
        onPanZoomStart?.(event.sourceEvent, viewport);
      }
    };
  }
  function createPanZoomHandler({ zoomPanValues, panOnDrag, onPaneContextMenu, onTransformChange, onPanZoom }) {
    return (event) => {
      zoomPanValues.usedRightMouseButton = !!(onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0));
      if (!event.sourceEvent?.sync) {
        onTransformChange([event.transform.x, event.transform.y, event.transform.k]);
      }
      if (onPanZoom && !event.sourceEvent?.internal) {
        onPanZoom?.(event.sourceEvent, transformToViewport(event.transform));
      }
    };
  }
  function createPanZoomEndHandler({ zoomPanValues, panOnDrag, panOnScroll, onDraggingChange, onPanZoomEnd, onPaneContextMenu }) {
    return (event) => {
      if (event.sourceEvent?.internal) {
        return;
      }
      zoomPanValues.isZoomingOrPanning = false;
      if (onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0) && !zoomPanValues.usedRightMouseButton && event.sourceEvent) {
        onPaneContextMenu(event.sourceEvent);
      }
      zoomPanValues.usedRightMouseButton = false;
      onDraggingChange(false);
      if (onPanZoomEnd && viewChanged(zoomPanValues.prevViewport, event.transform)) {
        const viewport = transformToViewport(event.transform);
        zoomPanValues.prevViewport = viewport;
        clearTimeout(zoomPanValues.timerId);
        zoomPanValues.timerId = setTimeout(
          () => {
            onPanZoomEnd?.(event.sourceEvent, viewport);
          },
          // we need a setTimeout for panOnScroll to supress multiple end events fired during scroll
          panOnScroll ? 150 : 0
        );
      }
    };
  }
  function createFilter({ zoomActivationKeyPressed, zoomOnScroll, zoomOnPinch, panOnDrag, panOnScroll, zoomOnDoubleClick, userSelectionActive, noWheelClassName, noPanClassName, lib, connectionInProgress }) {
    return (event) => {
      const zoomScroll = zoomActivationKeyPressed || zoomOnScroll;
      const pinchZoom = zoomOnPinch && event.ctrlKey;
      const isWheelEvent = event.type === "wheel";
      if (event.button === 1 && event.type === "mousedown" && (isWrappedWithClass(event, `${lib}-flow__node`) || isWrappedWithClass(event, `${lib}-flow__edge`))) {
        return true;
      }
      if (!panOnDrag && !zoomScroll && !panOnScroll && !zoomOnDoubleClick && !zoomOnPinch) {
        return false;
      }
      if (userSelectionActive) {
        return false;
      }
      if (connectionInProgress && !isWheelEvent) {
        return false;
      }
      if (isWrappedWithClass(event, noWheelClassName) && isWheelEvent) {
        return false;
      }
      if (isWrappedWithClass(event, noPanClassName) && (!isWheelEvent || panOnScroll && isWheelEvent && !zoomActivationKeyPressed)) {
        return false;
      }
      if (!zoomOnPinch && event.ctrlKey && isWheelEvent) {
        return false;
      }
      if (!zoomOnPinch && event.type === "touchstart" && event.touches?.length > 1) {
        event.preventDefault();
        return false;
      }
      if (!zoomScroll && !panOnScroll && !pinchZoom && isWheelEvent) {
        return false;
      }
      if (!panOnDrag && (event.type === "mousedown" || event.type === "touchstart")) {
        return false;
      }
      if (Array.isArray(panOnDrag) && !panOnDrag.includes(event.button) && event.type === "mousedown") {
        return false;
      }
      const buttonAllowed = Array.isArray(panOnDrag) && panOnDrag.includes(event.button) || !event.button || event.button <= 1;
      return (!event.ctrlKey || isWheelEvent) && buttonAllowed;
    };
  }
  function XYPanZoom({ domNode, minZoom, maxZoom, paneClickDistance, translateExtent, viewport, onPanZoom, onPanZoomStart, onPanZoomEnd, onDraggingChange }) {
    const zoomPanValues = {
      isZoomingOrPanning: false,
      usedRightMouseButton: false,
      prevViewport: { x: 0, y: 0, zoom: 0 },
      mouseButton: 0,
      timerId: void 0,
      panScrollTimeout: void 0,
      isPanScrolling: false
    };
    const bbox = domNode.getBoundingClientRect();
    const d3ZoomInstance = zoom_default2().clickDistance(!isNumeric(paneClickDistance) || paneClickDistance < 0 ? 0 : paneClickDistance).scaleExtent([minZoom, maxZoom]).translateExtent(translateExtent);
    const d3Selection = select_default2(domNode).call(d3ZoomInstance);
    setViewportConstrained({
      x: viewport.x,
      y: viewport.y,
      zoom: clamp(viewport.zoom, minZoom, maxZoom)
    }, [
      [0, 0],
      [bbox.width, bbox.height]
    ], translateExtent);
    const d3ZoomHandler = d3Selection.on("wheel.zoom");
    const d3DblClickZoomHandler = d3Selection.on("dblclick.zoom");
    d3ZoomInstance.wheelDelta(wheelDelta);
    function setTransform(transform2, options) {
      if (d3Selection) {
        return new Promise((resolve) => {
          d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).transform(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), transform2);
        });
      }
      return Promise.resolve(false);
    }
    function update({ noWheelClassName, noPanClassName, onPaneContextMenu, userSelectionActive, panOnScroll, panOnDrag, panOnScrollMode, panOnScrollSpeed, preventScrolling, zoomOnPinch, zoomOnScroll, zoomOnDoubleClick, zoomActivationKeyPressed, lib, onTransformChange, connectionInProgress }) {
      if (userSelectionActive && !zoomPanValues.isZoomingOrPanning) {
        destroy();
      }
      const isPanOnScroll = panOnScroll && !zoomActivationKeyPressed && !userSelectionActive;
      const wheelHandler = isPanOnScroll ? createPanOnScrollHandler({
        zoomPanValues,
        noWheelClassName,
        d3Selection,
        d3Zoom: d3ZoomInstance,
        panOnScrollMode,
        panOnScrollSpeed,
        zoomOnPinch,
        onPanZoomStart,
        onPanZoom,
        onPanZoomEnd
      }) : createZoomOnScrollHandler({
        noWheelClassName,
        preventScrolling,
        d3ZoomHandler
      });
      d3Selection.on("wheel.zoom", wheelHandler, { passive: false });
      if (!userSelectionActive) {
        const startHandler = createPanZoomStartHandler({
          zoomPanValues,
          onDraggingChange,
          onPanZoomStart
        });
        d3ZoomInstance.on("start", startHandler);
        const panZoomHandler = createPanZoomHandler({
          zoomPanValues,
          panOnDrag,
          onPaneContextMenu: !!onPaneContextMenu,
          onPanZoom,
          onTransformChange
        });
        d3ZoomInstance.on("zoom", panZoomHandler);
        const panZoomEndHandler = createPanZoomEndHandler({
          zoomPanValues,
          panOnDrag,
          panOnScroll,
          onPaneContextMenu,
          onPanZoomEnd,
          onDraggingChange
        });
        d3ZoomInstance.on("end", panZoomEndHandler);
      }
      const filter2 = createFilter({
        zoomActivationKeyPressed,
        panOnDrag,
        zoomOnScroll,
        panOnScroll,
        zoomOnDoubleClick,
        zoomOnPinch,
        userSelectionActive,
        noPanClassName,
        noWheelClassName,
        lib,
        connectionInProgress
      });
      d3ZoomInstance.filter(filter2);
      if (zoomOnDoubleClick) {
        d3Selection.on("dblclick.zoom", d3DblClickZoomHandler);
      } else {
        d3Selection.on("dblclick.zoom", null);
      }
    }
    function destroy() {
      d3ZoomInstance.on("zoom", null);
    }
    async function setViewportConstrained(viewport2, extent, translateExtent2) {
      const nextTransform = viewportToTransform(viewport2);
      const contrainedTransform = d3ZoomInstance?.constrain()(nextTransform, extent, translateExtent2);
      if (contrainedTransform) {
        await setTransform(contrainedTransform);
      }
      return new Promise((resolve) => resolve(contrainedTransform));
    }
    async function setViewport(viewport2, options) {
      const nextTransform = viewportToTransform(viewport2);
      await setTransform(nextTransform, options);
      return new Promise((resolve) => resolve(nextTransform));
    }
    function syncViewport(viewport2) {
      if (d3Selection) {
        const nextTransform = viewportToTransform(viewport2);
        const currentTransform = d3Selection.property("__zoom");
        if (currentTransform.k !== viewport2.zoom || currentTransform.x !== viewport2.x || currentTransform.y !== viewport2.y) {
          d3ZoomInstance?.transform(d3Selection, nextTransform, null, { sync: true });
        }
      }
    }
    function getViewport() {
      const transform2 = d3Selection ? transform(d3Selection.node()) : { x: 0, y: 0, k: 1 };
      return { x: transform2.x, y: transform2.y, zoom: transform2.k };
    }
    function scaleTo(zoom, options) {
      if (d3Selection) {
        return new Promise((resolve) => {
          d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).scaleTo(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), zoom);
        });
      }
      return Promise.resolve(false);
    }
    function scaleBy(factor, options) {
      if (d3Selection) {
        return new Promise((resolve) => {
          d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).scaleBy(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), factor);
        });
      }
      return Promise.resolve(false);
    }
    function setScaleExtent(scaleExtent) {
      d3ZoomInstance?.scaleExtent(scaleExtent);
    }
    function setTranslateExtent(translateExtent2) {
      d3ZoomInstance?.translateExtent(translateExtent2);
    }
    function setClickDistance(distance2) {
      const validDistance = !isNumeric(distance2) || distance2 < 0 ? 0 : distance2;
      d3ZoomInstance?.clickDistance(validDistance);
    }
    return {
      update,
      destroy,
      setViewport,
      setViewportConstrained,
      getViewport,
      scaleTo,
      scaleBy,
      setScaleExtent,
      setTranslateExtent,
      syncViewport,
      setClickDistance
    };
  }
  var ResizeControlVariant;
  (function(ResizeControlVariant2) {
    ResizeControlVariant2["Line"] = "line";
    ResizeControlVariant2["Handle"] = "handle";
  })(ResizeControlVariant || (ResizeControlVariant = {}));
  var initPrevValues = { width: 0, height: 0, x: 0, y: 0 };
  var initStartValues = {
    ...initPrevValues,
    pointerX: 0,
    pointerY: 0,
    aspectRatio: 1
  };

  // node_modules/@lit/reactive-element/css-tag.js
  var t = globalThis;
  var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
  var s = /* @__PURE__ */ Symbol();
  var o = /* @__PURE__ */ new WeakMap();
  var n = class {
    constructor(t5, e6, o8) {
      if (this._$cssResult$ = true, o8 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
      this.cssText = t5, this.t = e6;
    }
    get styleSheet() {
      let t5 = this.o;
      const s5 = this.t;
      if (e && void 0 === t5) {
        const e6 = void 0 !== s5 && 1 === s5.length;
        e6 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s5, t5));
      }
      return t5;
    }
    toString() {
      return this.cssText;
    }
  };
  var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
  var i = (t5, ...e6) => {
    const o8 = 1 === t5.length ? t5[0] : e6.reduce((e7, s5, o9) => e7 + ((t6) => {
      if (true === t6._$cssResult$) return t6.cssText;
      if ("number" == typeof t6) return t6;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(s5) + t5[o9 + 1], t5[0]);
    return new n(o8, t5, s);
  };
  var S = (s5, o8) => {
    if (e) s5.adoptedStyleSheets = o8.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
    else for (const e6 of o8) {
      const o9 = document.createElement("style"), n7 = t.litNonce;
      void 0 !== n7 && o9.setAttribute("nonce", n7), o9.textContent = e6.cssText, s5.appendChild(o9);
    }
  };
  var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
    let e6 = "";
    for (const s5 of t6.cssRules) e6 += s5.cssText;
    return r(e6);
  })(t5) : t5;

  // node_modules/@lit/reactive-element/reactive-element.js
  var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
  var a = globalThis;
  var c2 = a.trustedTypes;
  var l = c2 ? c2.emptyScript : "";
  var p = a.reactiveElementPolyfillSupport;
  var d = (t5, s5) => t5;
  var u = { toAttribute(t5, s5) {
    switch (s5) {
      case Boolean:
        t5 = t5 ? l : null;
        break;
      case Object:
      case Array:
        t5 = null == t5 ? t5 : JSON.stringify(t5);
    }
    return t5;
  }, fromAttribute(t5, s5) {
    let i7 = t5;
    switch (s5) {
      case Boolean:
        i7 = null !== t5;
        break;
      case Number:
        i7 = null === t5 ? null : Number(t5);
        break;
      case Object:
      case Array:
        try {
          i7 = JSON.parse(t5);
        } catch (t6) {
          i7 = null;
        }
    }
    return i7;
  } };
  var f = (t5, s5) => !i2(t5, s5);
  var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
  Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
  var y = class extends HTMLElement {
    static addInitializer(t5) {
      this._$Ei(), (this.l ??= []).push(t5);
    }
    static get observedAttributes() {
      return this.finalize(), this._$Eh && [...this._$Eh.keys()];
    }
    static createProperty(t5, s5 = b) {
      if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
        const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i7, s5);
        void 0 !== h3 && e2(this.prototype, t5, h3);
      }
    }
    static getPropertyDescriptor(t5, s5, i7) {
      const { get: e6, set: r5 } = h(this.prototype, t5) ?? { get() {
        return this[s5];
      }, set(t6) {
        this[s5] = t6;
      } };
      return { get: e6, set(s6) {
        const h3 = e6?.call(this);
        r5?.call(this, s6), this.requestUpdate(t5, h3, i7);
      }, configurable: true, enumerable: true };
    }
    static getPropertyOptions(t5) {
      return this.elementProperties.get(t5) ?? b;
    }
    static _$Ei() {
      if (this.hasOwnProperty(d("elementProperties"))) return;
      const t5 = n2(this);
      t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
    }
    static finalize() {
      if (this.hasOwnProperty(d("finalized"))) return;
      if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
        const t6 = this.properties, s5 = [...r2(t6), ...o2(t6)];
        for (const i7 of s5) this.createProperty(i7, t6[i7]);
      }
      const t5 = this[Symbol.metadata];
      if (null !== t5) {
        const s5 = litPropertyMetadata.get(t5);
        if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
      }
      this._$Eh = /* @__PURE__ */ new Map();
      for (const [t6, s5] of this.elementProperties) {
        const i7 = this._$Eu(t6, s5);
        void 0 !== i7 && this._$Eh.set(i7, t6);
      }
      this.elementStyles = this.finalizeStyles(this.styles);
    }
    static finalizeStyles(s5) {
      const i7 = [];
      if (Array.isArray(s5)) {
        const e6 = new Set(s5.flat(1 / 0).reverse());
        for (const s6 of e6) i7.unshift(c(s6));
      } else void 0 !== s5 && i7.push(c(s5));
      return i7;
    }
    static _$Eu(t5, s5) {
      const i7 = s5.attribute;
      return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
    }
    constructor() {
      super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
    }
    _$Ev() {
      this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
    }
    addController(t5) {
      (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
    }
    removeController(t5) {
      this._$EO?.delete(t5);
    }
    _$E_() {
      const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
      for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
      t5.size > 0 && (this._$Ep = t5);
    }
    createRenderRoot() {
      const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
      return S(t5, this.constructor.elementStyles), t5;
    }
    connectedCallback() {
      this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
    }
    enableUpdating(t5) {
    }
    disconnectedCallback() {
      this._$EO?.forEach((t5) => t5.hostDisconnected?.());
    }
    attributeChangedCallback(t5, s5, i7) {
      this._$AK(t5, i7);
    }
    _$ET(t5, s5) {
      const i7 = this.constructor.elementProperties.get(t5), e6 = this.constructor._$Eu(t5, i7);
      if (void 0 !== e6 && true === i7.reflect) {
        const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s5, i7.type);
        this._$Em = t5, null == h3 ? this.removeAttribute(e6) : this.setAttribute(e6, h3), this._$Em = null;
      }
    }
    _$AK(t5, s5) {
      const i7 = this.constructor, e6 = i7._$Eh.get(t5);
      if (void 0 !== e6 && this._$Em !== e6) {
        const t6 = i7.getPropertyOptions(e6), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
        this._$Em = e6;
        const r5 = h3.fromAttribute(s5, t6.type);
        this[e6] = r5 ?? this._$Ej?.get(e6) ?? r5, this._$Em = null;
      }
    }
    requestUpdate(t5, s5, i7, e6 = false, h3) {
      if (void 0 !== t5) {
        const r5 = this.constructor;
        if (false === e6 && (h3 = this[t5]), i7 ??= r5.getPropertyOptions(t5), !((i7.hasChanged ?? f)(h3, s5) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r5._$Eu(t5, i7)))) return;
        this.C(t5, s5, i7);
      }
      false === this.isUpdatePending && (this._$ES = this._$EP());
    }
    C(t5, s5, { useDefault: i7, reflect: e6, wrapped: h3 }, r5) {
      i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r5 ?? s5 ?? this[t5]), true !== h3 || void 0 !== r5) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e6 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
    }
    async _$EP() {
      this.isUpdatePending = true;
      try {
        await this._$ES;
      } catch (t6) {
        Promise.reject(t6);
      }
      const t5 = this.scheduleUpdate();
      return null != t5 && await t5, !this.isUpdatePending;
    }
    scheduleUpdate() {
      return this.performUpdate();
    }
    performUpdate() {
      if (!this.isUpdatePending) return;
      if (!this.hasUpdated) {
        if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
          for (const [t7, s6] of this._$Ep) this[t7] = s6;
          this._$Ep = void 0;
        }
        const t6 = this.constructor.elementProperties;
        if (t6.size > 0) for (const [s6, i7] of t6) {
          const { wrapped: t7 } = i7, e6 = this[s6];
          true !== t7 || this._$AL.has(s6) || void 0 === e6 || this.C(s6, void 0, i7, e6);
        }
      }
      let t5 = false;
      const s5 = this._$AL;
      try {
        t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
      } catch (s6) {
        throw t5 = false, this._$EM(), s6;
      }
      t5 && this._$AE(s5);
    }
    willUpdate(t5) {
    }
    _$AE(t5) {
      this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
    }
    _$EM() {
      this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
    }
    get updateComplete() {
      return this.getUpdateComplete();
    }
    getUpdateComplete() {
      return this._$ES;
    }
    shouldUpdate(t5) {
      return true;
    }
    update(t5) {
      this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
    }
    updated(t5) {
    }
    firstUpdated(t5) {
    }
  };
  y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

  // node_modules/lit-html/lit-html.js
  var t2 = globalThis;
  var i3 = (t5) => t5;
  var s2 = t2.trustedTypes;
  var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
  var h2 = "$lit$";
  var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
  var n3 = "?" + o3;
  var r3 = `<${n3}>`;
  var l2 = document;
  var c3 = () => l2.createComment("");
  var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
  var u2 = Array.isArray;
  var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
  var f2 = "[ 	\n\f\r]";
  var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
  var _ = /-->/g;
  var m = />/g;
  var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
  var g = /'/g;
  var $ = /"/g;
  var y2 = /^(?:script|style|textarea|title)$/i;
  var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
  var b2 = x(1);
  var w = x(2);
  var T = x(3);
  var E = /* @__PURE__ */ Symbol.for("lit-noChange");
  var A = /* @__PURE__ */ Symbol.for("lit-nothing");
  var C = /* @__PURE__ */ new WeakMap();
  var P = l2.createTreeWalker(l2, 129);
  function V(t5, i7) {
    if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
    return void 0 !== e3 ? e3.createHTML(i7) : i7;
  }
  var N = (t5, i7) => {
    const s5 = t5.length - 1, e6 = [];
    let n7, l4 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
    for (let i8 = 0; i8 < s5; i8++) {
      const s6 = t5[i8];
      let a4, u4, d3 = -1, f3 = 0;
      for (; f3 < s6.length && (c5.lastIndex = f3, u4 = c5.exec(s6), null !== u4); ) f3 = c5.lastIndex, c5 === v ? "!--" === u4[1] ? c5 = _ : void 0 !== u4[1] ? c5 = m : void 0 !== u4[2] ? (y2.test(u4[2]) && (n7 = RegExp("</" + u4[2], "g")), c5 = p2) : void 0 !== u4[3] && (c5 = p2) : c5 === p2 ? ">" === u4[0] ? (c5 = n7 ?? v, d3 = -1) : void 0 === u4[1] ? d3 = -2 : (d3 = c5.lastIndex - u4[2].length, a4 = u4[1], c5 = void 0 === u4[3] ? p2 : '"' === u4[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n7 = void 0);
      const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
      l4 += c5 === v ? s6 + r3 : d3 >= 0 ? (e6.push(a4), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
    }
    return [V(t5, l4 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e6];
  };
  var S2 = class _S {
    constructor({ strings: t5, _$litType$: i7 }, e6) {
      let r5;
      this.parts = [];
      let l4 = 0, a4 = 0;
      const u4 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i7);
      if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
        const t6 = this.el.content.firstChild;
        t6.replaceWith(...t6.childNodes);
      }
      for (; null !== (r5 = P.nextNode()) && d3.length < u4; ) {
        if (1 === r5.nodeType) {
          if (r5.hasAttributes()) for (const t6 of r5.getAttributeNames()) if (t6.endsWith(h2)) {
            const i8 = v2[a4++], s5 = r5.getAttribute(t6).split(o3), e7 = /([.?@])?(.*)/.exec(i8);
            d3.push({ type: 1, index: l4, name: e7[2], strings: s5, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r5.removeAttribute(t6);
          } else t6.startsWith(o3) && (d3.push({ type: 6, index: l4 }), r5.removeAttribute(t6));
          if (y2.test(r5.tagName)) {
            const t6 = r5.textContent.split(o3), i8 = t6.length - 1;
            if (i8 > 0) {
              r5.textContent = s2 ? s2.emptyScript : "";
              for (let s5 = 0; s5 < i8; s5++) r5.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l4 });
              r5.append(t6[i8], c3());
            }
          }
        } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l4 });
        else {
          let t6 = -1;
          for (; -1 !== (t6 = r5.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l4 }), t6 += o3.length - 1;
        }
        l4++;
      }
    }
    static createElement(t5, i7) {
      const s5 = l2.createElement("template");
      return s5.innerHTML = t5, s5;
    }
  };
  function M(t5, i7, s5 = t5, e6) {
    if (i7 === E) return i7;
    let h3 = void 0 !== e6 ? s5._$Co?.[e6] : s5._$Cl;
    const o8 = a2(i7) ? void 0 : i7._$litDirective$;
    return h3?.constructor !== o8 && (h3?._$AO?.(false), void 0 === o8 ? h3 = void 0 : (h3 = new o8(t5), h3._$AT(t5, s5, e6)), void 0 !== e6 ? (s5._$Co ??= [])[e6] = h3 : s5._$Cl = h3), void 0 !== h3 && (i7 = M(t5, h3._$AS(t5, i7.values), h3, e6)), i7;
  }
  var R = class {
    constructor(t5, i7) {
      this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(t5) {
      const { el: { content: i7 }, parts: s5 } = this._$AD, e6 = (t5?.creationScope ?? l2).importNode(i7, true);
      P.currentNode = e6;
      let h3 = P.nextNode(), o8 = 0, n7 = 0, r5 = s5[0];
      for (; void 0 !== r5; ) {
        if (o8 === r5.index) {
          let i8;
          2 === r5.type ? i8 = new k(h3, h3.nextSibling, this, t5) : 1 === r5.type ? i8 = new r5.ctor(h3, r5.name, r5.strings, this, t5) : 6 === r5.type && (i8 = new Z(h3, this, t5)), this._$AV.push(i8), r5 = s5[++n7];
        }
        o8 !== r5?.index && (h3 = P.nextNode(), o8++);
      }
      return P.currentNode = l2, e6;
    }
    p(t5) {
      let i7 = 0;
      for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
    }
  };
  var k = class _k {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(t5, i7, s5, e6) {
      this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e6, this._$Cv = e6?.isConnected ?? true;
    }
    get parentNode() {
      let t5 = this._$AA.parentNode;
      const i7 = this._$AM;
      return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t5, i7 = this) {
      t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
    }
    O(t5) {
      return this._$AA.parentNode.insertBefore(t5, this._$AB);
    }
    T(t5) {
      this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
    }
    _(t5) {
      this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
    }
    $(t5) {
      const { values: i7, _$litType$: s5 } = t5, e6 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
      if (this._$AH?._$AD === e6) this._$AH.p(i7);
      else {
        const t6 = new R(e6, this), s6 = t6.u(this.options);
        t6.p(i7), this.T(s6), this._$AH = t6;
      }
    }
    _$AC(t5) {
      let i7 = C.get(t5.strings);
      return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
    }
    k(t5) {
      u2(this._$AH) || (this._$AH = [], this._$AR());
      const i7 = this._$AH;
      let s5, e6 = 0;
      for (const h3 of t5) e6 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e6], s5._$AI(h3), e6++;
      e6 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e6), i7.length = e6);
    }
    _$AR(t5 = this._$AA.nextSibling, s5) {
      for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
        const s6 = i3(t5).nextSibling;
        i3(t5).remove(), t5 = s6;
      }
    }
    setConnected(t5) {
      void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
    }
  };
  var H = class {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(t5, i7, s5, e6, h3) {
      this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e6, this.options = h3, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
    }
    _$AI(t5, i7 = this, s5, e6) {
      const h3 = this.strings;
      let o8 = false;
      if (void 0 === h3) t5 = M(this, t5, i7, 0), o8 = !a2(t5) || t5 !== this._$AH && t5 !== E, o8 && (this._$AH = t5);
      else {
        const e7 = t5;
        let n7, r5;
        for (t5 = h3[0], n7 = 0; n7 < h3.length - 1; n7++) r5 = M(this, e7[s5 + n7], i7, n7), r5 === E && (r5 = this._$AH[n7]), o8 ||= !a2(r5) || r5 !== this._$AH[n7], r5 === A ? t5 = A : t5 !== A && (t5 += (r5 ?? "") + h3[n7 + 1]), this._$AH[n7] = r5;
      }
      o8 && !e6 && this.j(t5);
    }
    j(t5) {
      t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
    }
  };
  var I = class extends H {
    constructor() {
      super(...arguments), this.type = 3;
    }
    j(t5) {
      this.element[this.name] = t5 === A ? void 0 : t5;
    }
  };
  var L = class extends H {
    constructor() {
      super(...arguments), this.type = 4;
    }
    j(t5) {
      this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
    }
  };
  var z = class extends H {
    constructor(t5, i7, s5, e6, h3) {
      super(t5, i7, s5, e6, h3), this.type = 5;
    }
    _$AI(t5, i7 = this) {
      if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
      const s5 = this._$AH, e6 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h3 = t5 !== A && (s5 === A || e6);
      e6 && this.element.removeEventListener(this.name, this, s5), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
    }
    handleEvent(t5) {
      "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
    }
  };
  var Z = class {
    constructor(t5, i7, s5) {
      this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t5) {
      M(this, t5);
    }
  };
  var B = t2.litHtmlPolyfillSupport;
  B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
  var D = (t5, i7, s5) => {
    const e6 = s5?.renderBefore ?? i7;
    let h3 = e6._$litPart$;
    if (void 0 === h3) {
      const t6 = s5?.renderBefore ?? null;
      e6._$litPart$ = h3 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
    }
    return h3._$AI(t5), h3;
  };

  // node_modules/lit-element/lit-element.js
  var s3 = globalThis;
  var i4 = class extends y {
    constructor() {
      super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
    }
    createRenderRoot() {
      const t5 = super.createRenderRoot();
      return this.renderOptions.renderBefore ??= t5.firstChild, t5;
    }
    update(t5) {
      const r5 = this.render();
      this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r5, this.renderRoot, this.renderOptions);
    }
    connectedCallback() {
      super.connectedCallback(), this._$Do?.setConnected(true);
    }
    disconnectedCallback() {
      super.disconnectedCallback(), this._$Do?.setConnected(false);
    }
    render() {
      return E;
    }
  };
  i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
  var o4 = s3.litElementPolyfillSupport;
  o4?.({ LitElement: i4 });
  (s3.litElementVersions ??= []).push("4.2.2");

  // node_modules/lit-html/static.js
  var a3 = /* @__PURE__ */ Symbol.for("");
  var o5 = (t5) => {
    if (t5?.r === a3) return t5?._$litStatic$;
  };
  var s4 = (t5) => ({ _$litStatic$: t5, r: a3 });
  var l3 = /* @__PURE__ */ new Map();
  var n4 = (t5) => (r5, ...e6) => {
    const a4 = e6.length;
    let s5, i7;
    const n7 = [], u4 = [];
    let c5, $3 = 0, f3 = false;
    for (; $3 < a4; ) {
      for (c5 = r5[$3]; $3 < a4 && void 0 !== (i7 = e6[$3], s5 = o5(i7)); ) c5 += s5 + r5[++$3], f3 = true;
      $3 !== a4 && u4.push(i7), n7.push(c5), $3++;
    }
    if ($3 === a4 && n7.push(r5[a4]), f3) {
      const t6 = n7.join("$$lit$$");
      void 0 === (r5 = l3.get(t6)) && (n7.raw = n7, l3.set(t6, r5 = n7)), e6 = u4;
    }
    return t5(r5, ...e6);
  };
  var u3 = n4(b2);
  var c4 = n4(w);
  var $2 = n4(T);

  // node_modules/@lit/reactive-element/decorators/custom-element.js
  var t3 = (t5) => (e6, o8) => {
    void 0 !== o8 ? o8.addInitializer(() => {
      customElements.define(t5, e6);
    }) : customElements.define(t5, e6);
  };

  // node_modules/@lit/reactive-element/decorators/property.js
  var o6 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
  var r4 = (t5 = o6, e6, r5) => {
    const { kind: n7, metadata: i7 } = r5;
    let s5 = globalThis.litPropertyMetadata.get(i7);
    if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n7 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r5.name, t5), "accessor" === n7) {
      const { name: o8 } = r5;
      return { set(r6) {
        const n8 = e6.get.call(this);
        e6.set.call(this, r6), this.requestUpdate(o8, n8, t5, true, r6);
      }, init(e7) {
        return void 0 !== e7 && this.C(o8, void 0, t5, e7), e7;
      } };
    }
    if ("setter" === n7) {
      const { name: o8 } = r5;
      return function(r6) {
        const n8 = this[o8];
        e6.call(this, r6), this.requestUpdate(o8, n8, t5, true, r6);
      };
    }
    throw Error("Unsupported decorator location: " + n7);
  };
  function n5(t5) {
    return (e6, o8) => "object" == typeof o8 ? r4(t5, e6, o8) : ((t6, e7, o9) => {
      const r5 = e7.hasOwnProperty(o9);
      return e7.constructor.createProperty(o9, t6), r5 ? Object.getOwnPropertyDescriptor(e7, o9) : void 0;
    })(t5, e6, o8);
  }

  // node_modules/lit-html/directive.js
  var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
  var e5 = (t5) => (...e6) => ({ _$litDirective$: t5, values: e6 });
  var i5 = class {
    constructor(t5) {
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AT(t5, e6, i7) {
      this._$Ct = t5, this._$AM = e6, this._$Ci = i7;
    }
    _$AS(t5, e6) {
      return this.update(t5, e6);
    }
    update(t5, e6) {
      return this.render(...e6);
    }
  };

  // node_modules/lit-html/directives/style-map.js
  var n6 = "important";
  var i6 = " !" + n6;
  var o7 = e5(class extends i5 {
    constructor(t5) {
      if (super(t5), t5.type !== t4.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
    }
    render(t5) {
      return Object.keys(t5).reduce((e6, r5) => {
        const s5 = t5[r5];
        return null == s5 ? e6 : e6 + `${r5 = r5.includes("-") ? r5 : r5.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
      }, "");
    }
    update(e6, [r5]) {
      const { style: s5 } = e6.element;
      if (void 0 === this.ft) return this.ft = new Set(Object.keys(r5)), this.render(r5);
      for (const t5 of this.ft) null == r5[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
      for (const t5 in r5) {
        const e7 = r5[t5];
        if (null != e7) {
          this.ft.add(t5);
          const r6 = "string" == typeof e7 && e7.endsWith(i6);
          t5.includes("-") || r6 ? s5.setProperty(t5, r6 ? e7.slice(0, -11) : e7, r6 ? n6 : "") : s5[t5] = e7;
        }
      }
      return E;
    }
  });

  // node_modules/lit-flow/dist/external/lit-flow.js
  var FlowInstance = class {
    constructor(options = {}) {
      this.container = null;
      this.state = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        nodeLookup: /* @__PURE__ */ new Map(),
        edgeLookup: /* @__PURE__ */ new Map()
      };
      this.subscribers = /* @__PURE__ */ new Set();
      this.panZoomInstance = null;
      this.pendingNodes = [];
      this.panZoomUpdateOptions = null;
      this.options = {
        minZoom: 0.5,
        maxZoom: 2,
        defaultZoom: 1,
        nodesDraggable: true,
        nodesConnectable: true,
        elementsSelectable: true,
        ...options
      };
      this.state.nodes = options.nodes || [];
      this.state.edges = options.edges || [];
      this.updateLookups();
    }
    mount(container) {
      this.container = container;
      this.panZoomInstance = XYPanZoom({
        domNode: container,
        minZoom: this.options.minZoom || 0.5,
        maxZoom: this.options.maxZoom || 2,
        paneClickDistance: 0,
        translateExtent: [[-Infinity, -Infinity], [Infinity, Infinity]],
        viewport: this.state.viewport,
        onDraggingChange: (isDragging) => {
          this.container?.classList.toggle("panning", isDragging);
        },
        onPanZoom: (_event, viewport) => {
          this.state.viewport = viewport;
          this.notifySubscribers();
        },
        onPanZoomStart: (_event, _viewport) => {
        },
        onPanZoomEnd: (_event, _viewport) => {
        }
      });
      this.panZoomUpdateOptions = {
        noWheelClassName: "nowheel",
        noPanClassName: "nopan",
        onPaneContextMenu: void 0,
        preventScrolling: true,
        panOnScroll: true,
        panOnDrag: true,
        panOnScrollMode: "free",
        panOnScrollSpeed: 0.8,
        userSelectionActive: false,
        zoomOnPinch: true,
        zoomOnScroll: true,
        zoomOnDoubleClick: true,
        zoomActivationKeyPressed: false,
        lib: "lit-flow",
        onTransformChange: (_t) => {
        },
        connectionInProgress: false
      };
      this.panZoomInstance.update(this.panZoomUpdateOptions);
      this.notifySubscribers();
    }
    /**
     * Enable or disable panning on drag
     */
    setPanOnDrag(enabled) {
      if (this.panZoomInstance && this.panZoomUpdateOptions) {
        this.panZoomUpdateOptions = {
          ...this.panZoomUpdateOptions,
          panOnDrag: enabled
        };
        this.panZoomInstance.update(this.panZoomUpdateOptions);
      }
    }
    destroy() {
      this.panZoomInstance?.destroy();
      this.panZoomInstance = null;
      this.container = null;
      this.subscribers.clear();
    }
    getState() {
      return this.state;
    }
    get nodes() {
      return this.state.nodes;
    }
    get edges() {
      return this.state.edges;
    }
    getViewport() {
      return this.state.viewport;
    }
    setViewport(viewport) {
      this.state.viewport = viewport;
      this.panZoomInstance?.setViewport?.(viewport);
      this.notifySubscribers();
    }
    setNodes(nodes) {
      this.pendingNodes.push(...nodes.map((node) => node.id));
      this.state.nodes = nodes;
      this.updateLookups();
      this.notifySubscribers();
    }
    setEdges(edges) {
      this.retryEdgeRendering(edges);
    }
    updateNode(id2, updates) {
      this.state.nodes = this.state.nodes.map(
        (node) => node.id === id2 ? { ...node, ...updates } : node
      );
      this.updateLookups();
      this.notifySubscribers();
    }
    updateEdge(id2, updates) {
      this.state.edges = this.state.edges.map(
        (edge) => edge.id === id2 ? { ...edge, ...updates } : edge
      );
      this.updateLookups();
      this.notifySubscribers();
    }
    addNode(node) {
      this.state.nodes = [...this.state.nodes, node];
      this.updateLookups();
      this.notifySubscribers();
    }
    removeNode(id2) {
      this.state.nodes = this.state.nodes.filter((node) => node.id !== id2);
      this.state.edges = this.state.edges.filter(
        (edge) => edge.source !== id2 && edge.target !== id2
      );
      this.updateLookups();
      this.notifySubscribers();
    }
    addEdge(edge) {
      this.state.edges = [...this.state.edges, edge];
      this.updateLookups();
      this.notifySubscribers();
    }
    removeEdge(id2) {
      this.state.edges = this.state.edges.filter((edge) => edge.id !== id2);
      this.updateLookups();
      this.notifySubscribers();
    }
    subscribe(callback) {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }
    zoomIn() {
      const currentZoom = this.state.viewport.zoom;
      const newZoom = Math.min(currentZoom * 1.2, this.options.maxZoom || 2);
      this.setViewport({ ...this.state.viewport, zoom: newZoom });
    }
    zoomOut() {
      const currentZoom = this.state.viewport.zoom;
      const newZoom = Math.max(currentZoom / 1.2, this.options.minZoom || 0.5);
      this.setViewport({ ...this.state.viewport, zoom: newZoom });
    }
    fitView() {
      if (this.state.nodes.length === 0 || !this.container) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.state.nodes.forEach((node) => {
        const width = node.measured?.width || node.width || 150;
        const height = node.measured?.height || node.height || 50;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
      });
      const bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;
      const padding = 50;
      const zoomX = (containerWidth - padding * 2) / bounds.width;
      const zoomY = (containerHeight - padding * 2) / bounds.height;
      const zoom = Math.min(zoomX, zoomY, this.options.maxZoom || 2);
      const x2 = (containerWidth - bounds.width * zoom) / 2 - bounds.x * zoom;
      const y3 = (containerHeight - bounds.height * zoom) / 2 - bounds.y * zoom;
      this.setViewport({ x: x2, y: y3, zoom });
    }
    updateLookups() {
      this.state.nodeLookup.clear();
      this.state.nodes.forEach((node) => {
        const internalNode = {
          ...node,
          measured: node.measured || { width: node.width, height: node.height },
          internals: {
            positionAbsolute: node.position,
            z: node.zIndex || 0,
            userNode: node
          }
        };
        this.state.nodeLookup.set(node.id, internalNode);
      });
      this.state.edgeLookup.clear();
      this.state.edges.forEach((edge) => {
        this.state.edgeLookup.set(edge.id, edge);
      });
    }
    /**
     * Check if a node is fully rendered
     */
    isNodeRendered(nodeId) {
      if (!this.container) return false;
      const nodeEl = this.container.querySelector(`[id="${CSS.escape(nodeId)}"]`);
      if (!nodeEl) return false;
      const rect = nodeEl.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    /**
     * Check if any of the required nodes are still pending
     */
    hasPendingNodes(nodeIds) {
      return nodeIds.some((id2) => this.pendingNodes.includes(id2) || !this.isNodeRendered(id2));
    }
    /**
     * Remove node from pending list when it's rendered
     */
    markNodeAsRendered(nodeId) {
      const index = this.pendingNodes.indexOf(nodeId);
      if (index > -1) {
        this.pendingNodes.splice(index, 1);
      }
    }
    /**
     * Retry edge rendering with delay if nodes are still pending
     */
    retryEdgeRendering(edges, retryCount = 0, maxRetries = 10) {
      const allNodeIds = edges.flatMap((edge) => [edge.source, edge.target]);
      const uniqueNodeIds = [...new Set(allNodeIds)];
      if (this.hasPendingNodes(uniqueNodeIds) && retryCount < maxRetries) {
        setTimeout(() => {
          this.retryEdgeRendering(edges, retryCount + 1, maxRetries);
        }, 100);
      } else {
        this.state.edges = edges;
        this.updateLookups();
        this.notifySubscribers();
        uniqueNodeIds.forEach((id2) => this.markNodeAsRendered(id2));
      }
    }
    notifySubscribers() {
      this.subscribers.forEach((callback) => callback(this.state));
    }
  };
  function getBezierPath2(params) {
    return getBezierPath(params);
  }
  function getSmoothStepPath2(params) {
    return getSmoothStepPath(params);
  }
  function getStraightPath2(params) {
    return getStraightPath(params);
  }
  var __defProp$8 = Object.defineProperty;
  var __getOwnPropDesc$9 = Object.getOwnPropertyDescriptor;
  var __decorateClass$a = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$9(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$8(target, key, result);
    return result;
  };
  var FlowCanvas = class extends i4 {
    constructor() {
      super();
      this.nodes = [];
      this.edges = [];
      this.viewport = { x: 0, y: 0, zoom: 1 };
      this.nodeTypes = {
        "default": "flow-node",
        "shape": "shape-node",
        "erd-table": "erd-table-node"
      };
      this.connection = null;
      this.isHoveringNode = false;
      this.onHandleStart = (e6) => {
        const { nodeId, type, handleId } = e6.detail;
        this.connection = { from: { nodeId, handleId } };
      };
      this.onMouseMove = (e6) => {
        if (!this.connection) return;
        const p3 = this.screenToCanvas(e6.clientX, e6.clientY);
        this.connection.preview = p3;
        this.requestUpdate();
      };
      this.onMouseUp = (e6) => {
        if (!this.connection) return;
        const path = e6.composedPath();
        let targetEl = null;
        let targetHandleId;
        for (const t5 of path) {
          if (t5 instanceof HTMLElement) {
            const tagName = t5.tagName.toLowerCase();
            if (tagName === "flow-node" || Object.values(this.nodeTypes).some((tag) => tag === tagName)) {
              targetEl = t5;
              break;
            }
            if (t5.dataset.handleId) {
              targetHandleId = t5.dataset.handleId;
            }
          }
        }
        const targetId = targetEl?.getAttribute("id") || void 0;
        if (this.connection.from && targetId && targetId !== this.connection.from.nodeId) {
          const newEdgeId = `e-${this.connection.from.nodeId}-${targetId}-${Date.now()}`;
          const sourceNodeId = this.connection.from.nodeId;
          const sourceHandleId = this.connection.from.handleId;
          let finalTargetHandleId = targetHandleId;
          if (!finalTargetHandleId) {
            const targetNode = this.nodes.find((n7) => n7.id === targetId);
            if (targetNode && targetNode.type === "shape") {
              finalTargetHandleId = this.determineBestTargetHandle(sourceNodeId, targetId);
              console.log("Auto-determined target handle:", { sourceNodeId, targetId, finalTargetHandleId });
            }
          }
          this.instance.addEdge({
            id: newEdgeId,
            source: sourceNodeId,
            target: targetId,
            sourceHandle: sourceHandleId,
            targetHandle: finalTargetHandleId,
            data: {}
          });
        }
        this.connection = null;
        this.requestUpdate();
      };
      this.onNodeMouseEnter = (e6) => {
        const target = e6.target;
        const nodeTypes = ["flow-node", ...Object.values(this.nodeTypes)];
        let nodeElement = null;
        for (const nodeType of nodeTypes) {
          const element = target.closest(nodeType);
          if (element && element.id) {
            if (this.nodes.some((node) => node.id === element.id)) {
              nodeElement = element;
              break;
            }
          }
        }
        if (nodeElement && !this.isHoveringNode) {
          this.isHoveringNode = true;
          this.instance.setPanOnDrag(false);
        }
      };
      this.onNodeMouseLeave = (e6) => {
        const target = e6.target;
        const nodeTypes = ["flow-node", ...Object.values(this.nodeTypes)];
        let nodeElement = null;
        for (const nodeType of nodeTypes) {
          const element = target.closest(nodeType);
          if (element && element.id && this.nodes.some((node) => node.id === element.id)) {
            nodeElement = element;
            break;
          }
        }
        if (nodeElement && this.isHoveringNode) {
          setTimeout(() => {
            const pointElement = document.elementFromPoint(e6.clientX, e6.clientY);
            if (!pointElement || !(pointElement instanceof HTMLElement) || !this.isElementNode(pointElement)) {
              this.isHoveringNode = false;
              this.instance.setPanOnDrag(true);
            }
          }, 10);
        }
      };
      this.onNodeSelect = (e6) => {
        const { nodeId, selected, node } = e6.detail;
        this.instance.updateNode(nodeId, { selected });
        this.dispatchEvent(new CustomEvent("node-selected", {
          detail: {
            nodeId,
            selected,
            node,
            allSelectedNodes: this.nodes.filter((n7) => n7.selected)
          },
          bubbles: true,
          composed: true
        }));
      };
      this.onEdgeSelect = (e6) => {
        const { edgeId, selected, edge } = e6.detail;
        this.instance.updateEdge(edgeId, { selected });
        this.dispatchEvent(new CustomEvent("edge-selected", {
          detail: {
            edgeId,
            selected,
            edge,
            allSelectedEdges: this.edges.filter((e22) => e22.selected)
          },
          bubbles: true,
          composed: true
        }));
      };
      this.instance = new FlowInstance({ nodes: this.nodes, edges: this.edges });
    }
    createRenderRoot() {
      return super.createRenderRoot();
    }
    getNodeGeom(nodeId) {
      const el = this.renderRoot.querySelector(`flow-node[id="${CSS.escape(nodeId)}"]`);
      const viewportEl = this.renderRoot.querySelector(".flow-viewport");
      if (!el || !viewportEl) return null;
      const rect = el.getBoundingClientRect();
      const vpRect = viewportEl.getBoundingClientRect();
      const z2 = this.viewport.zoom || 1;
      const x2 = (rect.left - vpRect.left - this.viewport.x) / z2;
      const y3 = (rect.top - vpRect.top - this.viewport.y) / z2;
      const w2 = rect.width / z2;
      const h3 = rect.height / z2;
      const cy = y3 + h3 / 2;
      return { left: { x: x2, y: cy }, right: { x: x2 + w2, y: cy } };
    }
    /**
     * Get handle position in canvas coordinates
     */
    getHandleCanvasPosition(nodeId, handleId) {
      const nodeEl = this.renderRoot.querySelector(`[id="${CSS.escape(nodeId)}"]`);
      if (!nodeEl) return null;
      let handleEl = null;
      const shadowRoot = nodeEl.shadowRoot;
      if (shadowRoot) {
        handleEl = shadowRoot.querySelector(`[data-handle-id="${CSS.escape(handleId)}"]`);
      }
      if (!handleEl) {
        handleEl = nodeEl.querySelector(`[data-handle-id="${CSS.escape(handleId)}"]`);
      }
      if (!handleEl) return null;
      const node = this.nodes.find((n7) => n7.id === nodeId);
      if (!node) return null;
      if (node.type === "shape") {
        console.log("getHandleCanvasPosition for shape node:", { nodeId, handleId, node });
        return this.getShapeHandlePosition(node, handleId);
      }
      const nodeRect = nodeEl.getBoundingClientRect();
      const handleRect = handleEl.getBoundingClientRect();
      const zoom = this.viewport.zoom || 1;
      const offsetX = (handleRect.left + handleRect.width / 2 - nodeRect.left) / zoom;
      const offsetY = (handleRect.top + handleRect.height / 2 - nodeRect.top) / zoom;
      return {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      };
    }
    /**
     * Get handle position for shape nodes based on shape size and handle type
     */
    getShapeHandlePosition(node, handleId) {
      const shapeData = node.data;
      if (!shapeData) return null;
      const size = shapeData.size || { width: 200, height: 200 };
      const width = size.width;
      const height = size.height;
      const parts = handleId.split("-");
      const handleType = parts[parts.length - 1];
      console.log("getShapeHandlePosition:", { handleId, parts, handleType, node: node.id, size });
      let offsetX = 0;
      let offsetY = 0;
      switch (handleType) {
        case "right":
          offsetX = width;
          offsetY = height / 2;
          break;
        case "left":
          offsetX = 0;
          offsetY = height / 2;
          break;
        case "top":
          offsetX = width / 2;
          offsetY = 0;
          break;
        case "bottom":
          offsetX = width / 2;
          offsetY = height;
          break;
        default:
          offsetX = width / 2;
          offsetY = height / 2;
      }
      const result = {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      };
      console.log("getShapeHandlePosition result:", {
        nodeId: node.id,
        position: node.position,
        offsetX,
        offsetY,
        result
      });
      return result;
    }
    setNodes(nodes) {
      this.instance.setNodes(nodes);
    }
    setEdges(edges) {
      this.instance.setEdges(edges);
    }
    /**
     * Determine the best target handle for a shape node based on connection direction
     */
    determineBestTargetHandle(sourceNodeId, targetNodeId) {
      const sourceNode = this.nodes.find((n7) => n7.id === sourceNodeId);
      const targetNode = this.nodes.find((n7) => n7.id === targetNodeId);
      if (!sourceNode || !targetNode) return `${targetNodeId}-target-left`;
      const sourceX = sourceNode.position.x;
      const sourceY = sourceNode.position.y;
      const targetX = targetNode.position.x;
      const targetY = targetNode.position.y;
      const targetData = targetNode.data;
      const targetWidth = targetData?.size?.width || 200;
      const targetHeight = targetData?.size?.height || 200;
      const sourceCenterX = sourceX + (sourceNode.width || 150) / 2;
      const sourceCenterY = sourceY + (sourceNode.height || 50) / 2;
      const targetCenterX = targetX + targetWidth / 2;
      const targetCenterY = targetY + targetHeight / 2;
      const deltaX = targetCenterX - sourceCenterX;
      const deltaY = targetCenterY - sourceCenterY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? `${targetNodeId}-target-left` : `${targetNodeId}-target-right`;
      } else {
        return deltaY > 0 ? `${targetNodeId}-target-top` : `${targetNodeId}-target-bottom`;
      }
    }
    computeLabelCanvasPosition(edge) {
      const sourceNode = this.nodes.find((n7) => n7.id === edge.source);
      const targetNode = this.nodes.find((n7) => n7.id === edge.target);
      if (!sourceNode || !targetNode) return null;
      let sourceX, sourceY;
      let targetX, targetY;
      if (edge.sourceHandle) {
        const handlePos = this.getHandleCanvasPosition(edge.source, edge.sourceHandle);
        if (handlePos) {
          sourceX = handlePos.x;
          sourceY = handlePos.y;
        } else {
          const sourceWidth = sourceNode.measured?.width || sourceNode.width || 150;
          const sourceHeight = sourceNode.measured?.height || sourceNode.height || 50;
          sourceX = sourceNode.position.x + sourceWidth;
          sourceY = sourceNode.position.y + sourceHeight / 2;
        }
      } else {
        const sourceWidth = sourceNode.measured?.width || sourceNode.width || 150;
        const sourceHeight = sourceNode.measured?.height || sourceNode.height || 50;
        sourceX = sourceNode.position.x + sourceWidth;
        sourceY = sourceNode.position.y + sourceHeight / 2;
      }
      if (edge.targetHandle) {
        const handlePos = this.getHandleCanvasPosition(edge.target, edge.targetHandle);
        if (handlePos) {
          targetX = handlePos.x;
          targetY = handlePos.y;
        } else {
          targetX = targetNode.position.x;
          const targetHeight = targetNode.measured?.height || targetNode.height || 50;
          targetY = targetNode.position.y + targetHeight / 2;
        }
      } else {
        targetX = targetNode.position.x;
        const targetHeight = targetNode.measured?.height || targetNode.height || 50;
        targetY = targetNode.position.y + targetHeight / 2;
      }
      const [, labelX, labelY] = getBezierPath2({
        sourceX,
        sourceY,
        sourcePosition: Position.Right,
        targetX,
        targetY,
        targetPosition: Position.Left
      });
      return { x: labelX, y: labelY };
    }
    computeStartLabelCanvasPosition(edge) {
      const sourceNode = this.nodes.find((n7) => n7.id === edge.source);
      if (!sourceNode) return null;
      let sourceX, sourceY;
      if (edge.sourceHandle) {
        const handlePos = this.getHandleCanvasPosition(edge.source, edge.sourceHandle);
        if (handlePos) {
          sourceX = handlePos.x;
          sourceY = handlePos.y;
        } else {
          const sourceWidth = sourceNode.measured?.width || sourceNode.width || 150;
          const sourceHeight = sourceNode.measured?.height || sourceNode.height || 50;
          sourceX = sourceNode.position.x + sourceWidth;
          sourceY = sourceNode.position.y + sourceHeight / 2;
        }
      } else {
        const sourceWidth = sourceNode.measured?.width || sourceNode.width || 150;
        const sourceHeight = sourceNode.measured?.height || sourceNode.height || 50;
        sourceX = sourceNode.position.x + sourceWidth;
        sourceY = sourceNode.position.y + sourceHeight / 2;
      }
      return { x: sourceX + 12, y: sourceY - 10 };
    }
    computeEndLabelCanvasPosition(edge) {
      const targetNode = this.nodes.find((n7) => n7.id === edge.target);
      if (!targetNode) return null;
      let targetX, targetY;
      if (edge.targetHandle) {
        const handlePos = this.getHandleCanvasPosition(edge.target, edge.targetHandle);
        if (handlePos) {
          targetX = handlePos.x;
          targetY = handlePos.y;
        } else {
          const targetHeight = targetNode.measured?.height || targetNode.height || 50;
          targetX = targetNode.position.x;
          targetY = targetNode.position.y + targetHeight / 2;
        }
      } else {
        const targetHeight = targetNode.measured?.height || targetNode.height || 50;
        targetX = targetNode.position.x;
        targetY = targetNode.position.y + targetHeight / 2;
      }
      return { x: targetX - 12, y: targetY - 10 };
    }
    firstUpdated() {
      const container = this.renderRoot.querySelector(".flow-container");
      if (container) {
        this.instance.mount(container);
        this.unsubscribe = this.instance.subscribe((state) => {
          this.nodes = state.nodes;
          this.edges = state.edges;
          this.viewport = state.viewport;
          this.requestUpdate();
        });
        container.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
        container.addEventListener("node-select", this.onNodeSelect);
        document.addEventListener("edge-select", this.onEdgeSelect);
        container.addEventListener("mouseenter", this.onNodeMouseEnter, true);
        container.addEventListener("mouseleave", this.onNodeMouseLeave, true);
      }
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.unsubscribe?.();
      this.instance.destroy();
      const container = this.renderRoot.querySelector(".flow-container");
      container?.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
      container?.removeEventListener("node-select", this.onNodeSelect);
      document.removeEventListener("edge-select", this.onEdgeSelect);
      container?.removeEventListener("mouseenter", this.onNodeMouseEnter, true);
      container?.removeEventListener("mouseleave", this.onNodeMouseLeave, true);
    }
    /**
     * Renders a node with dynamic tag name based on node type
     * Falls back to 'flow-node' if type is not registered
     */
    renderNode(node) {
      const nodeType = node.type || "default";
      const tagName = this.nodeTypes[nodeType] || "flow-node";
      const tag = s4(tagName);
      return u3`
      <${tag}
        .id=${node.id}
        .data=${node.data}
        .position=${node.position}
        .selected=${node.selected || false}
        .draggable=${node.draggable !== false}
        .connectable=${node.connectable !== false}
        .resizable=${node.resizable || false}
        .drag_handle_selector=${node.drag_handle_selector || null}
        .instance=${this.instance}
        @handle-start=${this.onHandleStart}
      ></${tag}>
    `;
    }
    render() {
      const transform2 = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;
      return u3`
      <div class="flow-container">
        <slot name="background"></slot>
        <div 
          class="flow-viewport" 
          style=${o7({ transform: transform2 })}
        >
          <div class="flow-edges-layer">
            ${this.edges.map((edge) => {
        const sourceNode = this.nodes.find((n7) => n7.id === edge.source);
        const targetNode = this.nodes.find((n7) => n7.id === edge.target);
        if (!sourceNode || !targetNode) return null;
        return u3`
                <flow-edge 
                  .id=${edge.id}
                  .source=${edge.source}
                  .target=${edge.target}
                  .sourceHandle=${edge.sourceHandle}
                  .targetHandle=${edge.targetHandle}
                  .sourceNode=${sourceNode}
                  .targetNode=${targetNode}
                  .animated=${edge.animated || false}
                  .label=${edge.label || ""}
                  .type=${edge.type || "default"}
                  .markerStart=${edge.markerStart}
                  .markerEnd=${edge.markerEnd}
                ></flow-edge>
              `;
      })}
            ${this.renderPreviewEdge()}
          </div>
          <div class="flow-nodes-layer">
            ${this.nodes.map((node) => this.renderNode(node))}
          </div>
          <div class="flow-labels-overlay">
            ${this.edges.map((edge) => {
        const labelHtml = edge.data && edge.data.labelHtml;
        const labelText = edge.data && edge.data.label;
        const hasCenter = !!labelHtml || !!labelText;
        if (!hasCenter) return null;
        const pos = this.computeLabelCanvasPosition(edge);
        if (!pos) return null;
        const style = `transform: translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px);`;
        return labelHtml ? u3`<div class="edge-label" style="${style}" .innerHTML=${labelHtml}></div>` : u3`<div class="edge-label" style="${style}">${labelText}</div>`;
      })}
            ${this.edges.map((edge) => {
        const startHtml = edge.data && edge.data.startLabelHtml;
        const startText = edge.data && edge.data.startLabel;
        if (!startHtml && !startText) return null;
        const pos = this.computeStartLabelCanvasPosition(edge);
        if (!pos) return null;
        const style = `transform: translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px);`;
        return startHtml ? u3`<div class="edge-label" style="${style}" .innerHTML=${startHtml}></div>` : u3`<div class="edge-label" style="${style}">${startText}</div>`;
      })}
            ${this.edges.map((edge) => {
        const endHtml = edge.data && edge.data.endLabelHtml;
        const endText = edge.data && edge.data.endLabel;
        if (!endHtml && !endText) return null;
        const pos = this.computeEndLabelCanvasPosition(edge);
        if (!pos) return null;
        const style = `transform: translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px);`;
        return endHtml ? u3`<div class="edge-label" style="${style}" .innerHTML=${endHtml}></div>` : u3`<div class="edge-label" style="${style}">${endText}</div>`;
      })}
          </div>
        </div>
        <slot></slot>
      </div>
    `;
    }
    screenToCanvas(x2, y3) {
      const container = this.renderRoot.querySelector(".flow-container");
      if (!container) return { x: x2, y: y3 };
      const rect = container.getBoundingClientRect();
      const vx = this.viewport.x;
      const vy = this.viewport.y;
      const z2 = this.viewport.zoom || 1;
      return { x: (x2 - rect.left - vx) / z2, y: (y3 - rect.top - vy) / z2 };
    }
    isElementNode(element) {
      if (!element) return false;
      const nodeTypes = ["flow-node", ...Object.values(this.nodeTypes)];
      for (const nodeType of nodeTypes) {
        const nodeElement = element.closest(nodeType);
        if (nodeElement && nodeElement.id) {
          return this.nodes.some((node) => node.id === nodeElement.id);
        }
      }
      return false;
    }
    renderPreviewEdge() {
      if (!this.connection || !this.connection.preview) return null;
      const preview = this.connection.preview;
      const nodeFrom = this.connection.from ? this.nodes.find((n7) => n7.id === this.connection.from.nodeId) : null;
      const nodeTo = this.connection.to ? this.nodes.find((n7) => n7.id === this.connection.to.nodeId) : null;
      if (nodeFrom) {
        return u3`
        <flow-edge
          .id=${"preview"}
          .source=${nodeFrom.id}
          .target=${"__preview__"}
          .sourceHandle=${this.connection.from?.handleId}
          .sourceNode=${{ ...nodeFrom, position: nodeFrom.position }}
          .targetNode=${{ id: "__preview__", position: { x: preview.x, y: preview.y }, width: 1, height: 1, data: {} }}
          .animated=${true}
          .label=${""}
        ></flow-edge>
      `;
      }
      if (nodeTo) {
        return u3`
        <flow-edge
          .id=${"preview"}
          .source=${"__preview__"}
          .target=${nodeTo.id}
          .sourceNode=${{ id: "__preview__", position: { x: preview.x, y: preview.y }, width: 1, height: 1, data: {} }}
          .targetHandle=${this.connection.to?.handleId}
          .targetNode=${{ ...nodeTo, position: nodeTo.position }}
          .animated=${true}
          .label=${""}
        ></flow-edge>
      `;
      }
      return null;
    }
  };
  FlowCanvas.styles = i`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: var(--flow-background-color, #fafafa);
    }

    .flow-container {
      width: 100%;
      height: 100%;
      position: relative;
      cursor: grab;
    }

    .flow-container.panning {
      cursor: grabbing;
    }

    .flow-viewport {
      width: 100%;
      height: 100%;
      position: relative;
      transform-origin: 0 0;
      will-change: transform;
    }

    .flow-nodes-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .flow-edges-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
       pointer-events: none;
    }

    .flow-labels-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .edge-label {
      position: absolute;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 12px;
      color: #333;
      pointer-events: all;
      white-space: nowrap;
      user-select: none;
    }
  `;
  __decorateClass$a([
    n5({ type: Array })
  ], FlowCanvas.prototype, "nodes", 2);
  __decorateClass$a([
    n5({ type: Array })
  ], FlowCanvas.prototype, "edges", 2);
  __decorateClass$a([
    n5({ type: Object })
  ], FlowCanvas.prototype, "viewport", 2);
  __decorateClass$a([
    n5({ type: Object })
  ], FlowCanvas.prototype, "nodeTypes", 2);
  FlowCanvas = __decorateClass$a([
    t3("flow-canvas")
  ], FlowCanvas);
  var __defProp$7 = Object.defineProperty;
  var __getOwnPropDesc$8 = Object.getOwnPropertyDescriptor;
  var __decorateClass$9 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$8(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$7(target, key, result);
    return result;
  };
  var NodeResizer = class extends i4 {
    constructor() {
      super(...arguments);
      this.visible = false;
      this.minWidth = 10;
      this.minHeight = 10;
      this.maxWidth = Number.MAX_VALUE;
      this.maxHeight = Number.MAX_VALUE;
      this.keepAspectRatio = false;
      this.isResizing = false;
      this.resizeStart = { x: 0, y: 0, width: 0, height: 0 };
      this.resizeHandle = "";
      this.handleMouseDown = (e6) => {
        const target = e6.target;
        console.log("NodeResizer handleMouseDown:", target, target.classList);
        let isResizeHandle = target.classList.contains("resize-handle");
        if (!isResizeHandle && target === this) {
          const path = e6.composedPath();
          isResizeHandle = path.some(
            (el) => el instanceof HTMLElement && el.classList.contains("resize-handle")
          );
        }
        console.log("Is resize handle:", isResizeHandle);
        if (!isResizeHandle) return;
        e6.preventDefault();
        e6.stopPropagation();
        e6.stopImmediatePropagation();
        this.isResizing = true;
        const parentElement = this.getRootNode().host;
        this.resizeStart = {
          x: e6.clientX,
          y: e6.clientY,
          width: parentElement?.offsetWidth || 0,
          height: parentElement?.offsetHeight || 0
        };
        let resizeHandleEl = null;
        if (target.classList.contains("resize-handle")) {
          resizeHandleEl = target;
        } else if (target === this) {
          const path = e6.composedPath();
          resizeHandleEl = path.find(
            (el) => el instanceof HTMLElement && el.classList.contains("resize-handle")
          ) || null;
        }
        if (resizeHandleEl) {
          const classes = Array.from(resizeHandleEl.classList);
          this.resizeHandle = classes.find((cls) => cls !== "resize-handle") || "";
          console.log("Resize handle direction:", this.resizeHandle);
        }
        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
        console.log({
          width: this.resizeStart.width,
          height: this.resizeStart.height
        });
        this.dispatchEvent(new CustomEvent("resize-start", {
          detail: {
            width: this.resizeStart.width,
            height: this.resizeStart.height
          },
          bubbles: true,
          composed: true
        }));
      };
      this.handleMouseMove = (e6) => {
        if (!this.isResizing) return;
        const parentElement = this.getRootNode().host;
        if (!parentElement) return;
        console.log("NodeResizer handleMouseMove:", e6);
        const deltaX = e6.clientX - this.resizeStart.x;
        const deltaY = e6.clientY - this.resizeStart.y;
        let newWidth = this.resizeStart.width;
        let newHeight = this.resizeStart.height;
        switch (this.resizeHandle) {
          case "nw":
            newWidth = this.resizeStart.width - deltaX;
            newHeight = this.resizeStart.height - deltaY;
            break;
          case "ne":
            newWidth = this.resizeStart.width + deltaX;
            newHeight = this.resizeStart.height - deltaY;
            break;
          case "sw":
            newWidth = this.resizeStart.width - deltaX;
            newHeight = this.resizeStart.height + deltaY;
            break;
          case "se":
            newWidth = this.resizeStart.width + deltaX;
            newHeight = this.resizeStart.height + deltaY;
            break;
          case "n":
            newHeight = this.resizeStart.height - deltaY;
            break;
          case "s":
            newHeight = this.resizeStart.height + deltaY;
            break;
          case "w":
            newWidth = this.resizeStart.width - deltaX;
            break;
          case "e":
            newWidth = this.resizeStart.width + deltaX;
            break;
        }
        newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
        newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));
        if (this.keepAspectRatio) {
          const aspectRatio = this.resizeStart.width / this.resizeStart.height;
          if (this.resizeHandle.includes("w") || this.resizeHandle.includes("e")) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        parentElement.style.width = `${newWidth}px`;
        parentElement.style.height = `${newHeight}px`;
        this.dispatchEvent(new CustomEvent("resize", {
          detail: {
            width: newWidth,
            height: newHeight,
            handle: this.resizeHandle
          },
          bubbles: true,
          composed: true
        }));
      };
      this.handleMouseUp = () => {
        if (!this.isResizing) return;
        this.isResizing = false;
        this.cleanup();
        const parentElement = this.getRootNode().host;
        this.dispatchEvent(new CustomEvent("resize-end", {
          detail: {
            width: parentElement?.offsetWidth || 0,
            height: parentElement?.offsetHeight || 0
          },
          bubbles: true,
          composed: true
        }));
      };
    }
    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("mousedown", this.handleMouseDown);
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener("mousedown", this.handleMouseDown);
      this.cleanup();
    }
    cleanup() {
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", this.handleMouseUp);
    }
    render() {
      if (!this.visible) return b2``;
      return b2`
      <div class="resize-border"></div>
      <div class="resize-handle nw"></div>
      <div class="resize-handle ne"></div>
      <div class="resize-handle sw"></div>
      <div class="resize-handle se"></div>
      <div class="resize-handle n"></div>
      <div class="resize-handle s"></div>
      <div class="resize-handle w"></div>
      <div class="resize-handle e"></div>
    `;
    }
  };
  NodeResizer.styles = i`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
    }

    .resize-handle {
      position: absolute;
      background: var(--flow-node-selected-color, #1a73e8);
      border: 2px solid #fff;
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: auto;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .resize-handle:hover {
      opacity: 1;
    }

    :host([visible]) .resize-handle {
      opacity: 1;
    }

    .resize-handle.nw {
      top: -8px;
      left: -8px;
      width: 12px;
      height: 12px;
      cursor: nw-resize;
    }

    .resize-handle.ne {
      top: -8px;
      right: -8px;
      width: 12px;
      height: 12px;
      cursor: ne-resize;
    }

    .resize-handle.sw {
      bottom: -8px;
      left: -8px;
      width: 12px;
      height: 12px;
      cursor: sw-resize;
    }

    .resize-handle.se {
      bottom: -8px;
      right: -8px;
      width: 12px;
      height: 12px;
      cursor: se-resize;
    }

    .resize-handle.n {
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      cursor: n-resize;
    }

    .resize-handle.s {
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      cursor: s-resize;
    }

    .resize-handle.w {
      top: 50%;
      left: -8px;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      cursor: w-resize;
    }

    .resize-handle.e {
      top: 50%;
      right: -8px;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      cursor: e-resize;
    }

    .resize-border {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 1px dashed var(--flow-node-selected-color, #1a73e8);
      opacity: 0;
      pointer-events: none;
    }

    :host([visible]) .resize-border {
      opacity: 1;
    }
  `;
  __decorateClass$9([
    n5({ type: Boolean, reflect: true })
  ], NodeResizer.prototype, "visible", 2);
  __decorateClass$9([
    n5({ type: Number })
  ], NodeResizer.prototype, "minWidth", 2);
  __decorateClass$9([
    n5({ type: Number })
  ], NodeResizer.prototype, "minHeight", 2);
  __decorateClass$9([
    n5({ type: Number })
  ], NodeResizer.prototype, "maxWidth", 2);
  __decorateClass$9([
    n5({ type: Number })
  ], NodeResizer.prototype, "maxHeight", 2);
  __decorateClass$9([
    n5({ type: Boolean })
  ], NodeResizer.prototype, "keepAspectRatio", 2);
  NodeResizer = __decorateClass$9([
    t3("node-resizer")
  ], NodeResizer);
  var __defProp$6 = Object.defineProperty;
  var __getOwnPropDesc$7 = Object.getOwnPropertyDescriptor;
  var __decorateClass$8 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$7(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$6(target, key, result);
    return result;
  };
  var FlowNode = class extends i4 {
    constructor() {
      super(...arguments);
      this.id = "";
      this.data = {};
      this.position = { x: 0, y: 0 };
      this.selected = false;
      this.dragging = false;
      this.draggable = true;
      this.resizable = false;
      this.isDragging = false;
      this.dragStart = { x: 0, y: 0 };
      this.nodeStart = { x: 0, y: 0 };
      this.lastMeasured = null;
      this.handleWheel = (e6) => {
        const path = e6.composedPath();
        let scrollableEl = null;
        for (const element of path) {
          if (element instanceof Element) {
            scrollableEl = this.findScrollableElement(element);
            if (scrollableEl) break;
          }
        }
        if (scrollableEl) {
          const canScrollVertically = e6.deltaY < 0 && scrollableEl.scrollTop > 0 || e6.deltaY > 0 && scrollableEl.scrollTop < scrollableEl.scrollHeight - scrollableEl.clientHeight;
          const canScrollHorizontally = e6.deltaX < 0 && scrollableEl.scrollLeft > 0 || e6.deltaX > 0 && scrollableEl.scrollLeft < scrollableEl.scrollWidth - scrollableEl.clientWidth;
          if (canScrollVertically || canScrollHorizontally) {
            e6.stopPropagation();
          }
        }
      };
      this.handleClick = (e6) => {
        e6.stopPropagation();
        if (!this.isDragging && this.instance) {
          const newSelected = !this.selected;
          this.instance.updateNode(this.id, { selected: newSelected });
          this.dispatchEvent(new CustomEvent("node-select", {
            detail: {
              nodeId: this.id,
              selected: newSelected,
              node: {
                id: this.id,
                data: this.data,
                position: this.position,
                selected: newSelected
              }
            },
            bubbles: true,
            composed: true
          }));
        }
      };
      this.handleResize = (e6) => {
        const { width, height } = e6.detail;
        if (this.instance) {
          this.instance.updateNode(this.id, {
            width,
            height,
            measured: { width, height }
          });
        }
      };
      this.handleResizeEnd = (e6) => {
        const { width, height } = e6.detail;
        if (this.instance) {
          this.instance.updateNode(this.id, {
            width,
            height,
            measured: { width, height }
          });
        }
        this.dispatchEvent(new CustomEvent("node-resize-end", {
          detail: {
            nodeId: this.id,
            width,
            height
          },
          bubbles: true,
          composed: true
        }));
      };
      this.handleMouseDown = (e6) => {
        if (!this.draggable || e6.button !== 0) return;
        const target = e6.target;
        const isFromResizeHandle = target.classList.contains("resize-handle") || target.tagName === "NODE-RESIZER" || target.closest("node-resizer") !== null;
        if (isFromResizeHandle) {
          return;
        }
        e6.preventDefault();
        e6.stopPropagation();
        this.isDragging = false;
        this.dragStart = { x: e6.clientX, y: e6.clientY };
        this.nodeStart = { ...this.position };
        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
      };
      this.handleMouseMove = (e6) => {
        const dx = e6.clientX - this.dragStart.x;
        const dy = e6.clientY - this.dragStart.y;
        if (!this.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          this.isDragging = true;
          this.dragging = true;
          if (this.instance) {
            this.instance.updateNode(this.id, { dragging: true });
          }
        }
        if (this.isDragging && this.instance) {
          const viewport = this.instance.getViewport();
          const newPosition = {
            x: this.nodeStart.x + dx / viewport.zoom,
            y: this.nodeStart.y + dy / viewport.zoom
          };
          this.instance.updateNode(this.id, { position: newPosition });
        }
      };
      this.handleMouseUp = () => {
        if (this.isDragging && this.instance) {
          this.instance.updateNode(this.id, { dragging: false });
        }
        this.cleanup();
        setTimeout(() => {
          this.isDragging = false;
          this.dragging = false;
        }, 50);
      };
    }
    firstUpdated() {
      if (this.draggable) {
        this.addEventListener("mousedown", this.handleMouseDown);
      }
      this.addEventListener("click", this.handleClick);
      this.addEventListener("wheel", this.handleWheel, { passive: false });
      if (this.resizable) {
        this.addEventListener("resize", this.handleResize);
        this.addEventListener("resize-end", this.handleResizeEnd);
      }
      this.updateMeasuredSize();
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener("mousedown", this.handleMouseDown);
      this.removeEventListener("click", this.handleClick);
      this.removeEventListener("wheel", this.handleWheel);
      if (this.resizable) {
        this.removeEventListener("resize", this.handleResize);
        this.removeEventListener("resize-end", this.handleResizeEnd);
      }
      this.cleanup();
    }
    /**
     * Find the nearest scrollable parent element
     */
    findScrollableElement(element) {
      if (!element || !(element instanceof HTMLElement)) return null;
      if (element.classList.contains("nowheel")) {
        return element;
      }
      const style = window.getComputedStyle(element);
      const overflow = style.overflow + style.overflowX + style.overflowY;
      if (overflow.includes("auto") || overflow.includes("scroll")) {
        if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
          return element;
        }
      }
      const parent = element.parentElement;
      if (parent && (parent === this || parent.closest("flow-node") === this || this.shadowRoot?.contains(parent))) {
        return this.findScrollableElement(parent);
      }
      return null;
    }
    cleanup() {
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", this.handleMouseUp);
    }
    render() {
      return b2`
      <div class="node-container">
        <div class="node-content">
          ${this.data?.label || "Node"}
        </div>
        <div 
          class="handle target" 
          data-handle="target" 
          data-node-id=${this.id}
          @mousedown=${this.onHandleMouseDown("target")}
        ></div>
        <div 
          class="handle source" 
          data-handle="source" 
          data-node-id=${this.id}
          @mousedown=${this.onHandleMouseDown("source")}
        ></div>
      </div>
      ${this.resizable ? b2`
        <node-resizer
          .visible=${this.selected}
          min-width="50"
          min-height="30"
          max-width="500"
          max-height="300"
        ></node-resizer>
      ` : ""}
    `;
    }
    updated(changedProperties) {
      super.updated(changedProperties);
      this.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
      this.updateMeasuredSize();
      if (changedProperties.has("resizable")) {
        console.log("FlowNode resizable changed:", this.resizable);
      }
    }
    updateMeasuredSize() {
      if (!this.instance) return;
      const rect = this.getBoundingClientRect();
      const zoom = this.instance.getViewport().zoom || 1;
      const width = rect.width / zoom;
      const height = rect.height / zoom;
      const changed = !this.lastMeasured || Math.abs(this.lastMeasured.width - width) > 0.5 || Math.abs(this.lastMeasured.height - height) > 0.5;
      if (changed) {
        this.lastMeasured = { width, height };
        this.instance.updateNode(this.id, { measured: { width, height }, width, height });
      }
    }
    onHandleMouseDown(type) {
      return (e6) => {
        e6.stopPropagation();
        e6.preventDefault();
        this.dispatchEvent(new CustomEvent("handle-start", {
          detail: { nodeId: this.id, type },
          bubbles: true,
          composed: true
        }));
      };
    }
  };
  FlowNode.styles = i`
    :host {
      position: absolute;
      border: 1px solid var(--flow-node-border, #ddd);
      border-radius: 8px;
      background: var(--flow-node-background, white);
      padding: 10px 20px;
      cursor: grab;
      user-select: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s;
      transform-origin: 0 0;
      will-change: transform;
      pointer-events: auto;
    }

    :host([dragging]) {
      cursor: grabbing;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
    }

    :host(:hover) {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }

    :host([selected]) {
      border-color: var(--flow-node-selected-border, #1a73e8);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3);
    }

    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .handle {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--flow-handle-bg, #fff);
      border: 1px solid var(--flow-handle-border, #1a73e8);
      box-shadow: 0 0 0 1px rgba(26, 115, 232, 0.15);
      cursor: crosshair;
      pointer-events: auto;
    }

    .handle.source {
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
    }

    .handle.target {
      left: -5px;
      top: 50%;
      transform: translateY(-50%);
    }
  `;
  __decorateClass$8([
    n5({ type: String, reflect: true })
  ], FlowNode.prototype, "id", 2);
  __decorateClass$8([
    n5({ type: Object })
  ], FlowNode.prototype, "data", 2);
  __decorateClass$8([
    n5({ type: Object })
  ], FlowNode.prototype, "position", 2);
  __decorateClass$8([
    n5({ type: Boolean, reflect: true })
  ], FlowNode.prototype, "selected", 2);
  __decorateClass$8([
    n5({ type: Boolean, reflect: true })
  ], FlowNode.prototype, "dragging", 2);
  __decorateClass$8([
    n5({ type: Boolean })
  ], FlowNode.prototype, "draggable", 2);
  __decorateClass$8([
    n5({ type: Object })
  ], FlowNode.prototype, "instance", 2);
  __decorateClass$8([
    n5({ type: Boolean })
  ], FlowNode.prototype, "resizable", 2);
  FlowNode = __decorateClass$8([
    t3("flow-node")
  ], FlowNode);
  var __defProp$5 = Object.defineProperty;
  var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
  var __decorateClass$7 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$5(target, key, result);
    return result;
  };
  var FlowEdge = class extends i4 {
    constructor() {
      super(...arguments);
      this.id = "";
      this.source = "";
      this.target = "";
      this.animated = false;
      this.selected = false;
      this.label = "";
      this.type = "default";
      this.markerHandleHalf = 5;
    }
    // half of node handle diameter (10px)
    /**
     * Create marker ID from marker spec
     */
    getMarkerId(spec) {
      if (!spec) return void 0;
      if (typeof spec === "string") return spec;
      const key = this.normalizeMarkerSpec(spec);
      return `marker-${this.hashString(key)}`;
    }
    /**
     * Create marker SVG from marker spec
     */
    createMarkerSVG(id2, spec) {
      if (spec.type === "custom") {
        const width2 = spec.width ?? 10;
        const height2 = spec.height ?? 10;
        const refX2 = (spec.refX ?? width2) + this.markerHandleHalf;
        const refY2 = spec.refY ?? height2 / 2;
        const color22 = spec.color ?? "currentColor";
        const orient2 = spec.orient ?? "auto";
        return `<marker id="${id2}" markerWidth="${width2}" markerHeight="${height2}" refX="${refX2}" refY="${refY2}" orient="${orient2}" markerUnits="userSpaceOnUse"><path d="${spec.path}" fill="${color22}" stroke="${color22}"/></marker>`;
      }
      const width = spec.width ?? 10;
      const height = spec.height ?? 10;
      const orient = spec.orient ?? "auto";
      const color2 = spec.color ?? "currentColor";
      const refX = (spec.type === "ArrowClosed" ? width : width) + this.markerHandleHalf;
      const refY = height / 2;
      if (spec.type === "ArrowClosed") {
        const path2 = `M0,0 L${width},${refY} L0,${height} Z`;
        return `<marker id="${id2}" markerWidth="${width}" markerHeight="${height}" refX="${refX}" refY="${refY}" orient="${orient}" markerUnits="userSpaceOnUse"><path d="${path2}" fill="${color2}"/></marker>`;
      }
      const path = `M0,0 L${width},${refY} L0,${height}`;
      return `<marker id="${id2}" markerWidth="${width}" markerHeight="${height}" refX="${refX}" refY="${refY}" orient="${orient}" markerUnits="userSpaceOnUse"><path d="${path}" fill="none" stroke="${color2}" stroke-width="2"/></marker>`;
    }
    /**
     * Normalize marker spec to a string key for caching
     */
    normalizeMarkerSpec(spec) {
      if (spec.type === "custom") {
        const { path, width: width2 = 20, height: height2 = 20, refX = 20, refY = 10, orient: orient2 = "auto", color: color22 = "currentColor" } = spec;
        return `custom|p=${path}|w=${width2}|h=${height2}|rx=${refX}|ry=${refY}|o=${orient2}|c=${color22}`;
      }
      const { width = 20, height = 20, orient = "auto", color: color2 = "currentColor" } = spec;
      return `builtin|${spec.type}|w=${width}|h=${height}|o=${orient}|c=${color2}`;
    }
    /**
     * Simple hash function for generating unique IDs
     */
    hashString(input) {
      let h3 = 0;
      for (let i7 = 0; i7 < input.length; i7++) {
        h3 = (h3 << 5) - h3 + input.charCodeAt(i7);
        h3 |= 0;
      }
      return Math.abs(h3).toString(36);
    }
    /**
     * Get path based on edge type
     */
    getPathForType(source, target) {
      const sourceX = source.x;
      const sourceY = source.y;
      const targetX = target.x;
      const targetY = target.y;
      const sourcePosition = source.position;
      const targetPosition = target.position;
      switch (this.type) {
        case "straight":
          return getStraightPath2({
            sourceX,
            sourceY,
            targetX,
            targetY
          });
        case "smoothstep":
          return getSmoothStepPath2({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition
          });
        case "step":
          return getSmoothStepPath2({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 0
            // Step edges have no border radius
          });
        case "simplebezier":
          return getBezierPath2({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            curvature: 0.5
            // Simple bezier with fixed curvature
          });
        case "default":
        default:
          return getBezierPath2({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition
          });
      }
    }
    /** Returns the ShadowRoot of the parent flow-canvas */
    getFlowCanvasRoot() {
      const root2 = this.getRootNode();
      return root2 instanceof ShadowRoot ? root2 : null;
    }
    /** Returns the flow-canvas host element (if available) */
    getFlowCanvasHost() {
      const root2 = this.getFlowCanvasRoot();
      return root2 && root2.host || null;
    }
    /**
     * Find a specific handle element within a node
     */
    findHandleElement(nodeId, handleId) {
      const canvasRoot = this.getFlowCanvasRoot();
      if (!canvasRoot) return null;
      const node = canvasRoot.querySelector(`[id="${CSS.escape(nodeId)}"]`);
      if (!node) return null;
      const shadowRoot = node.shadowRoot;
      let handle = null;
      if (shadowRoot) {
        handle = shadowRoot.querySelector(`[data-handle-id="${CSS.escape(handleId)}"]`);
      }
      if (!handle) {
        handle = node.querySelector(`[data-handle-id="${CSS.escape(handleId)}"]`);
      }
      return handle;
    }
    /**
     * Get the canvas coordinates of a specific handle
     */
    getHandlePosition(nodeId, handleId) {
      const handleEl = this.findHandleElement(nodeId, handleId);
      if (!handleEl) return null;
      const canvasRoot = this.getFlowCanvasRoot();
      if (!canvasRoot) return null;
      const nodeEl = canvasRoot.querySelector(`[id="${CSS.escape(nodeId)}"]`);
      if (!nodeEl) return null;
      const nodeRect = nodeEl.getBoundingClientRect();
      const handleRect = handleEl.getBoundingClientRect();
      const node = this.sourceNode?.id === nodeId ? this.sourceNode : this.targetNode;
      if (!node) return null;
      node.measured?.width || node.width || 150;
      node.measured?.height || node.height || 50;
      const flowCanvas = this.getFlowCanvasHost();
      const viewport = flowCanvas?.viewport || { zoom: 1 };
      const zoom = viewport.zoom || 1;
      const offsetX = (handleRect.left + handleRect.width / 2 - nodeRect.left) / zoom;
      const offsetY = (handleRect.top + handleRect.height / 2 - nodeRect.top) / zoom;
      return {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      };
    }
    /**
     * Get the source position (handle or node edge)
     */
    getSourcePosition() {
      if (this.sourceHandle && this.sourceNode) {
        const handlePos = this.getHandlePosition(this.sourceNode.id, this.sourceHandle);
        if (handlePos) {
          return { ...handlePos, position: Position.Right };
        }
      }
      const sourceWidth = this.sourceNode.measured?.width || this.sourceNode.width || 150;
      const sourceHeight = this.sourceNode.measured?.height || this.sourceNode.height || 50;
      return {
        x: this.sourceNode.position.x + sourceWidth,
        y: this.sourceNode.position.y + sourceHeight / 2,
        position: Position.Right
      };
    }
    /**
     * Get the target position (handle or node edge)
     */
    getTargetPosition() {
      if (this.targetHandle && this.targetNode) {
        const handlePos = this.getHandlePosition(this.targetNode.id, this.targetHandle);
        if (handlePos) {
          return { ...handlePos, position: Position.Left };
        }
      }
      const targetHeight = this.targetNode.measured?.height || this.targetNode.height || 50;
      return {
        x: this.targetNode.position.x,
        y: this.targetNode.position.y + targetHeight / 2,
        position: Position.Left
      };
    }
    render() {
      if (!this.sourceNode || !this.targetNode) {
        return b2``;
      }
      const source = this.getSourcePosition();
      const target = this.getTargetPosition();
      const [path, labelX, labelY, offsetX, offsetY] = this.getPathForType(source, target);
      const pathClasses = [
        "edge-path",
        this.animated && "animated",
        this.selected && "selected"
      ].filter(Boolean).join(" ");
      const markerStartId = this.getMarkerId(this.markerStart);
      const markerEndId = this.getMarkerId(this.markerEnd);
      const markerStart = markerStartId ? `url(#${markerStartId})` : void 0;
      const markerEnd = markerEndId ? `url(#${markerEndId})` : void 0;
      const dashAttr = this.animated ? "5" : "";
      return b2`
      <svg style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:visible">
        <defs>
          ${markerStartId && typeof this.markerStart === "object" ? w`<marker id="${markerStartId}" markerWidth="${this.markerStart.width || 10}" markerHeight="${this.markerStart.height || 10}" refX="${((this.markerStart.type === "custom" ? this.markerStart.refX : void 0) || this.markerStart.width || 10) + this.markerHandleHalf}" refY="${(this.markerStart.type === "custom" ? this.markerStart.refY : void 0) || (this.markerStart.height || 10) / 2}" orient="${this.markerStart.orient || "auto"}" markerUnits="userSpaceOnUse">
              ${this.markerStart.type === "custom" ? w`<path d="${this.markerStart.path}" fill="${this.markerStart.color || "currentColor"}" stroke="${this.markerStart.color || "currentColor"}"/>` : this.markerStart.type === "ArrowClosed" ? w`<path d="M0,0 L${this.markerStart.width || 10},${(this.markerStart.height || 10) / 2} L0,${this.markerStart.height || 10} Z" fill="${this.markerStart.color || "currentColor"}"/>` : w`<path d="M0,0 L${this.markerStart.width || 10},${(this.markerStart.height || 10) / 2} L0,${this.markerStart.height || 10}" fill="none" stroke="${this.markerStart.color || "currentColor"}" stroke-width="2"/>`}
            </marker>` : ""}
          ${markerEndId && typeof this.markerEnd === "object" ? w`<marker id="${markerEndId}" markerWidth="${this.markerEnd.width || 10}" markerHeight="${this.markerEnd.height || 10}" refX="${((this.markerEnd.type === "custom" ? this.markerEnd.refX : void 0) || this.markerEnd.width || 10) + this.markerHandleHalf}" refY="${(this.markerEnd.type === "custom" ? this.markerEnd.refY : void 0) || (this.markerEnd.height || 10) / 2}" orient="${this.markerEnd.orient || "auto"}" markerUnits="userSpaceOnUse">
              ${this.markerEnd.type === "custom" ? w`<path d="${this.markerEnd.path}" fill="${this.markerEnd.color || "currentColor"}" stroke="${this.markerEnd.color || "currentColor"}"/>` : this.markerEnd.type === "ArrowClosed" ? w`<path d="M0,0 L${this.markerEnd.width || 10},${(this.markerEnd.height || 10) / 2} L0,${this.markerEnd.height || 10} Z" fill="${this.markerEnd.color || "currentColor"}"/>` : w`<path d="M0,0 L${this.markerEnd.width || 10},${(this.markerEnd.height || 10) / 2} L0,${this.markerEnd.height || 10}" fill="none" stroke="${this.markerEnd.color || "currentColor"}" stroke-width="2"/>`}
            </marker>` : ""}
        </defs>
        ${w`
          <path 
            class="${pathClasses}"
            d="${path}"
            stroke-dasharray="${dashAttr}"
            marker-start="${markerStart ?? ""}"
            marker-end="${markerEnd ?? ""}"
            @click=${this.handleClick}
          />
          ${this.label ? w`
            <text 
              x="${labelX}" 
              y="${labelY}" 
              text-anchor="middle"
              dy="-5"
              fill="#333"
              style="user-select:none; pointer-events:none; font-size:12px;"
            >
              ${this.label}
            </text>
          ` : ""}
        `}
      </svg>
    `;
    }
    handleClick(e6) {
      console.log("handleClick", e6);
      e6.stopPropagation();
      const newSelected = !this.selected;
      this.selected = newSelected;
      this.dispatchEvent(new CustomEvent("edge-select", {
        detail: {
          edgeId: this.id,
          selected: newSelected,
          edge: {
            id: this.id,
            source: this.source,
            target: this.target,
            sourceHandle: this.sourceHandle,
            targetHandle: this.targetHandle,
            label: this.label,
            animated: this.animated,
            selected: newSelected
          }
        },
        bubbles: true,
        composed: true
      }));
    }
  };
  FlowEdge.styles = i`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .edge-path {
      fill: none;
      stroke: var(--flow-edge-color, #b1b1b7);
      stroke-width: 3;
      cursor: pointer;
      pointer-events: stroke;
    }

    .edge-path:hover {
      stroke: var(--flow-edge-selected-color, #1a73e8);
    }

    .edge-path.selected {
      stroke: var(--flow-edge-selected-color, #1a73e8);
    }

    .edge-path.animated {
      stroke-dasharray: 5;
      animation: dashdraw 0.5s linear infinite;
    }

    .edge-label {
      pointer-events: none;
      user-select: none;
      fill: #333;
      font-size: 12px;
    }

    @keyframes dashdraw {
      to {
        stroke-dashoffset: -10;
      }
    }
  `;
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "id", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "source", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "target", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "sourceHandle", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "targetHandle", 2);
  __decorateClass$7([
    n5({ type: Object })
  ], FlowEdge.prototype, "sourceNode", 2);
  __decorateClass$7([
    n5({ type: Object })
  ], FlowEdge.prototype, "targetNode", 2);
  __decorateClass$7([
    n5({ type: Boolean })
  ], FlowEdge.prototype, "animated", 2);
  __decorateClass$7([
    n5({ type: Boolean })
  ], FlowEdge.prototype, "selected", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "label", 2);
  __decorateClass$7([
    n5({ type: String })
  ], FlowEdge.prototype, "type", 2);
  __decorateClass$7([
    n5({ type: Object })
  ], FlowEdge.prototype, "markerStart", 2);
  __decorateClass$7([
    n5({ type: Object })
  ], FlowEdge.prototype, "markerEnd", 2);
  FlowEdge = __decorateClass$7([
    t3("flow-edge")
  ], FlowEdge);
  var __defProp$4 = Object.defineProperty;
  var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
  var __decorateClass$6 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$4(target, key, result);
    return result;
  };
  var FlowBackground = class extends i4 {
    constructor() {
      super(...arguments);
      this.variant = "dots";
      this.gap = 20;
      this.color = "#ddd";
      this.size = 1;
    }
    render() {
      const patternId = `flow-bg-pattern-${Math.random().toString(36).substr(2, 9)}`;
      return b2`
      <svg>
        <defs>
          ${this.variant === "dots" ? this.renderDotsPattern(patternId) : this.renderLinesPattern(patternId)}
        </defs>
        <rect width="100%" height="100%" fill="url(#${patternId})" />
      </svg>
    `;
    }
    renderDotsPattern(id2) {
      return w`
      <pattern id="${id2}" x="0" y="0" width="${this.gap}" height="${this.gap}" patternUnits="userSpaceOnUse">
        <circle cx="${this.size}" cy="${this.size}" r="${this.size}" fill="${this.color}" />
      </pattern>
    `;
    }
    renderLinesPattern(id2) {
      return w`
      <pattern id="${id2}" x="0" y="0" width="${this.gap}" height="${this.gap}" patternUnits="userSpaceOnUse">
        <path d="M ${this.gap} 0 L 0 0 0 ${this.gap}" fill="none" stroke="${this.color}" stroke-width="${this.size}" />
      </pattern>
    `;
    }
  };
  FlowBackground.styles = i`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `;
  __decorateClass$6([
    n5({ type: String })
  ], FlowBackground.prototype, "variant", 2);
  __decorateClass$6([
    n5({ type: Number })
  ], FlowBackground.prototype, "gap", 2);
  __decorateClass$6([
    n5({ type: String })
  ], FlowBackground.prototype, "color", 2);
  __decorateClass$6([
    n5({ type: Number })
  ], FlowBackground.prototype, "size", 2);
  FlowBackground = __decorateClass$6([
    t3("flow-background")
  ], FlowBackground);
  var __defProp$3 = Object.defineProperty;
  var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
  var __decorateClass$5 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$3(target, key, result);
    return result;
  };
  var FlowMinimap = class extends i4 {
    constructor() {
      super(...arguments);
      this.width = 200;
      this.height = 150;
    }
    render() {
      return b2`
      <div class="minimap-container">
        <div class="viewport-indicator"></div>
        <slot></slot>
      </div>
    `;
    }
  };
  FlowMinimap.styles = i`
    :host {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      z-index: 10;
    }

    .minimap-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .viewport-indicator {
      position: absolute;
      border: 2px solid #1a73e8;
      background: rgba(26, 115, 232, 0.1);
      pointer-events: none;
    }
  `;
  __decorateClass$5([
    n5({ type: Number })
  ], FlowMinimap.prototype, "width", 2);
  __decorateClass$5([
    n5({ type: Number })
  ], FlowMinimap.prototype, "height", 2);
  FlowMinimap = __decorateClass$5([
    t3("flow-minimap")
  ], FlowMinimap);
  var __defProp$2 = Object.defineProperty;
  var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
  var __decorateClass$4 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$2(target, key, result);
    return result;
  };
  var FlowControls = class extends i4 {
    constructor() {
      super(...arguments);
      this.handleZoomIn = () => {
        this.instance?.zoomIn();
      };
      this.handleZoomOut = () => {
        this.instance?.zoomOut();
      };
      this.handleFitView = () => {
        this.instance?.fitView();
      };
    }
    render() {
      return b2`
      <button @click=${this.handleZoomIn} title="Zoom In">+</button>
      <button @click=${this.handleZoomOut} title="Zoom Out">−</button>
      <div class="divider"></div>
      <button @click=${this.handleFitView} title="Fit View">⛶</button>
    `;
    }
  };
  FlowControls.styles = i`
    :host {
      position: absolute;
      bottom: 20px;
      left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10;
    }

    button {
      width: 36px;
      height: 36px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
    }

    button:hover {
      background: #f5f5f5;
      border-color: #999;
    }

    button:active {
      background: #e0e0e0;
    }

    .divider {
      height: 1px;
      background: #ddd;
      margin: 4px 0;
    }
  `;
  __decorateClass$4([
    n5({ type: Object })
  ], FlowControls.prototype, "instance", 2);
  FlowControls = __decorateClass$4([
    t3("flow-controls")
  ], FlowControls);
  var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
  var __getProtoOf = Object.getPrototypeOf;
  var __reflectGet = Reflect.get;
  var __decorateClass$3 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = decorator(result) || result;
    return result;
  };
  var __superGet = (cls, obj, key) => __reflectGet(__getProtoOf(cls), key, obj);
  var ERDTableNode = class extends FlowNode {
    constructor() {
      super(...arguments);
      this.appliedInitialSize = false;
    }
    firstUpdated() {
      const data = this.data;
      const w2 = data?.size?.width;
      const h3 = data?.size?.height;
      if (typeof w2 === "number" && w2 > 0 || typeof h3 === "number" && h3 > 0) {
        if (typeof w2 === "number" && w2 > 0) this.style.width = `${w2}px`;
        if (typeof h3 === "number" && h3 > 0) this.style.height = `${h3}px`;
        if (this.instance) {
          this.instance.updateNode(this.id, {
            width: typeof w2 === "number" && w2 > 0 ? w2 : this.width,
            height: typeof h3 === "number" && h3 > 0 ? h3 : this.height
          });
        }
        this.appliedInitialSize = true;
      }
      super.firstUpdated();
    }
    updated(changedProperties) {
      super.updated(changedProperties);
    }
    onFieldHandleMouseDown(fieldName, side) {
      return (e6) => {
        e6.stopPropagation();
        e6.preventDefault();
        const handleId = `${this.id}-${fieldName}-${side}`;
        this.dispatchEvent(new CustomEvent("handle-start", {
          detail: {
            nodeId: this.id,
            type: side === "left" ? "target" : "source",
            handleId,
            fieldName
          },
          bubbles: true,
          composed: true
        }));
      };
    }
    render() {
      const tableData = this.data;
      const tableName = tableData?.tableName || "Table";
      const fields = tableData?.fields || [];
      return b2`
      <div class="table-header" style="${tableData.color ? `background: ${tableData.color}` : ""}">
        <span class="table-icon">📊</span>
        <span>${tableName}</span>
      </div>
      
      <div class="table-body nowheel">
        ${fields.map((field) => b2`
          <div class="field-row" data-field="${field.name}">
            <div class="field-key">
              ${field.key || ""}
            </div>
            <div class="field-name">${field.name}</div>
            <div class="field-type">${field.type}</div>
            <div class="field-nullable">
              ${field.nullable ? "NULL" : ""}
            </div>
            
            <!-- Left handle (input) for this field -->
            <div 
              class="field-handle left"
              data-handle="target"
              data-field="${field.name}"
              data-handle-id="${this.id}-${field.name}-left"
              @mousedown=${this.onFieldHandleMouseDown(field.name, "left")}
            ></div>
            
            <!-- Right handle (output) for this field -->
            <div 
              class="field-handle right"
              data-handle="source"
              data-field="${field.name}"
              data-handle-id="${this.id}-${field.name}-right"
              @mousedown=${this.onFieldHandleMouseDown(field.name, "right")}
            ></div>
          </div>
        `)}
      </div>
      ${this.resizable ? b2`
        <node-resizer
          .visible=${this.selected}
          min-width="150"
          min-height="80"
          max-width="500"
          max-height="400"
        ></node-resizer>
      ` : ""}
    `;
    }
  };
  ERDTableNode.styles = [
    ...Array.isArray(__superGet(ERDTableNode, ERDTableNode, "styles")) ? __superGet(ERDTableNode, ERDTableNode, "styles") : [__superGet(ERDTableNode, ERDTableNode, "styles")],
    i`
      :host {
        padding: 0;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        background: var(--erd-table-bg, white);
      }

      .table-header {
        background: var(--erd-table-header-bg, #2563eb);
        color: white;
        padding: 12px 16px;
        font-weight: 600;
        border-radius: 8px 8px 0 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .table-icon {
        font-size: 18px;
      }

      .table-body {
        padding: 0;
        overflow: auto;
        /* Prevent panning when scrolling inside the table body */
      }

      .field-row {
        display: grid;
        grid-template-columns: 30px 1fr auto auto;
        gap: 8px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--erd-border, #e5e7eb);
        align-items: center;
        position: relative;
        background: white;
        transition: background 0.2s;
      }

      .field-row:hover {
        background: var(--erd-row-hover, #f3f4f6);
      }

      .field-row:last-child {
        border-bottom: none;
        border-radius: 0 0 8px 8px;
      }

      .field-key {
        font-size: 10px;
        font-weight: 700;
        color: var(--erd-key-color, #dc2626);
      }

      .field-name {
        font-weight: 500;
        color: var(--erd-text, #1f2937);
      }

      .field-type {
        font-size: 11px;
        color: var(--erd-type-color, #6b7280);
        text-transform: uppercase;
      }

      .field-nullable {
        font-size: 10px;
        color: #9ca3af;
      }

      /* Handles for each field */
      .field-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--flow-handle-bg, #f1f1f1);
        cursor: crosshair;
        pointer-events: auto;
        z-index: 10;
        transition: all 0.2s;
      }

      .field-handle.left {
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
      }

      .field-handle.right {
        right: 3px;
        top: 50%;
        transform: translateY(-50%);
      }

      .field-handle:hover {
        background: var(--flow-handle-border, #2563eb);
        transform: translateY(-50%) scale(1.3);
      }
    `
  ];
  ERDTableNode = __decorateClass$3([
    t3("erd-table-node")
  ], ERDTableNode);
  var basicShapes = [
    {
      type: "circle",
      name: "Circle",
      category: "basic",
      path: "M 100 100 m -95 0 a 95 95 0 1 1 190 0 a 95 95 0 1 1 -190 0",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    },
    {
      type: "rectangle",
      name: "Rectangle",
      category: "basic",
      path: "M 5 5 L 195 5 L 195 195 L 5 195 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    },
    {
      type: "diamond",
      name: "Diamond",
      category: "basic",
      path: "M 100 5 L 195 100 L 100 195 L 5 100 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    },
    {
      type: "triangle",
      name: "Triangle",
      category: "basic",
      path: "M 100 5 L 195 195 L 5 195 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    }
  ];
  var geometricShapes = [
    {
      type: "hexagon",
      name: "Hexagon",
      category: "geometric",
      path: "M 100 5 L 175 52 L 175 148 L 100 195 L 25 148 L 25 52 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    },
    {
      type: "octagon",
      name: "Octagon",
      category: "geometric",
      path: "M 100 5 L 175 25 L 195 100 L 175 175 L 100 195 L 25 175 L 5 100 L 25 25 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    }
  ];
  var symbolicShapes = [
    {
      type: "heart",
      name: "Heart",
      category: "symbolic",
      path: "M 100 185 C 100 185, 10 95, 10 50 C 10 25, 35 5, 60 5 C 80 5, 100 25, 100 50 C 100 25, 120 5, 140 5 C 165 5, 190 25, 190 50 C 190 95, 100 185, 100 185 Z",
      viewBox: "0 0 200 200",
      defaultSize: { width: 200, height: 200 },
      centerPoint: { x: 100, y: 100 }
    }
  ];
  var _ShapeRegistry = class _ShapeRegistry2 {
    /**
     * Initialize the registry with default shapes
     */
    static initialize() {
      const allShapes = [...basicShapes, ...geometricShapes, ...symbolicShapes];
      allShapes.forEach((shape) => {
        this.shapes.set(shape.type, shape);
      });
    }
    /**
     * Register a new shape definition
     */
    static register(definition) {
      this.shapes.set(definition.type, definition);
    }
    /**
     * Get a shape definition by type
     */
    static get(shapeType) {
      return this.shapes.get(shapeType);
    }
    /**
     * Get all registered shapes
     */
    static getAll() {
      return Array.from(this.shapes.values());
    }
    /**
     * Get shapes by category
     */
    static getByCategory(category) {
      return Array.from(this.shapes.values()).filter((shape) => shape.category === category);
    }
    /**
     * Check if a shape type is registered
     */
    static has(shapeType) {
      return this.shapes.has(shapeType);
    }
    /**
     * Get all available shape types
     */
    static getShapeTypes() {
      return Array.from(this.shapes.keys());
    }
    /**
     * Clear all registered shapes
     */
    static clear() {
      this.shapes.clear();
    }
    /**
     * Get shape count
     */
    static getCount() {
      return this.shapes.size;
    }
  };
  _ShapeRegistry.shapes = /* @__PURE__ */ new Map();
  var ShapeRegistry = _ShapeRegistry;
  ShapeRegistry.initialize();
  var __defProp$1 = Object.defineProperty;
  var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
  var __decorateClass$2 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp$1(target, key, result);
    return result;
  };
  var ShapeNode = class extends i4 {
    constructor() {
      super(...arguments);
      this.id = "";
      this.selected = false;
      this.dragging = false;
      this.draggable = true;
      this.connectable = true;
      this.instance = null;
      this.resizable = false;
      this.isDragging = false;
      this.dragStart = { x: 0, y: 0 };
      this.nodeStart = { x: 0, y: 0 };
      this.handleClick = (e6) => {
        e6.stopPropagation();
        if (!this.isDragging && this.instance) {
          const newSelected = !this.selected;
          this.instance.updateNode(this.id, { selected: newSelected });
          this.dispatchEvent(new CustomEvent("node-select", {
            detail: {
              nodeId: this.id,
              selected: newSelected,
              node: {
                id: this.id,
                data: this.data,
                position: this.position,
                selected: newSelected
              }
            },
            bubbles: true,
            composed: true
          }));
        }
      };
      this.handleResize = (e6) => {
        const { width, height } = e6.detail;
        if (this.data && this.instance) {
          const updatedData = {
            ...this.data,
            size: { width, height }
          };
          this.instance.updateNode(this.id, {
            data: updatedData,
            width,
            height,
            measured: { width, height }
          });
        }
      };
      this.handleResizeEnd = (e6) => {
        const { width, height } = e6.detail;
        if (this.data && this.instance) {
          const updatedData = {
            ...this.data,
            size: { width, height }
          };
          this.instance.updateNode(this.id, {
            data: updatedData,
            width,
            height,
            measured: { width, height }
          });
        }
        this.dispatchEvent(new CustomEvent("node-resize-end", {
          detail: {
            nodeId: this.id,
            width,
            height
          },
          bubbles: true,
          composed: true
        }));
      };
      this.handleMouseDown = (e6) => {
        if (!this.draggable || e6.button !== 0) return;
        const target = e6.target;
        const isFromResizeHandle = target.classList.contains("resize-handle") || target.tagName === "NODE-RESIZER" || target.closest("node-resizer") !== null;
        if (isFromResizeHandle) {
          return;
        }
        e6.preventDefault();
        e6.stopPropagation();
        this.isDragging = false;
        this.dragStart = { x: e6.clientX, y: e6.clientY };
        this.nodeStart = { ...this.position };
        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
      };
      this.handleMouseMove = (e6) => {
        const dx = e6.clientX - this.dragStart.x;
        const dy = e6.clientY - this.dragStart.y;
        if (!this.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          this.isDragging = true;
          if (this.instance) {
            this.instance.updateNode(this.id, { dragging: true });
          }
        }
        if (this.isDragging && this.instance) {
          const viewport = this.instance.getViewport();
          const newPosition = {
            x: this.nodeStart.x + dx / viewport.zoom,
            y: this.nodeStart.y + dy / viewport.zoom
          };
          this.instance.updateNode(this.id, { position: newPosition });
        }
      };
      this.handleMouseUp = () => {
        console.log("handleMouseUp");
        if (this.isDragging && this.instance) {
          this.instance.updateNode(this.id, { dragging: false });
        }
        this.isDragging = false;
        this.cleanup();
      };
      this.handleHandleStart = (e6) => {
        console.log("handleHandleStart", e6);
        e6.stopPropagation();
        this.isDragging = false;
        const handle = e6.target;
        const handleId = handle.dataset.handleId;
        const handleType = handle.dataset.handleType;
        if (handleType && handleId) {
          this.dispatchEvent(new CustomEvent("handle-start", {
            detail: {
              nodeId: this.id,
              handleId,
              handleType,
              position: this.position
            },
            bubbles: true,
            composed: true
          }));
        }
      };
    }
    updated(changedProperties) {
      super.updated(changedProperties);
      if (changedProperties.has("position") && !this.isDragging) ;
      if (changedProperties.has("resizable")) {
        console.log("ShapeNode resizable changed:", this.resizable);
      }
    }
    /**
     * Get the shape definition from the registry
     */
    getShapeDefinition() {
      if (!this.data?.type) {
        return void 0;
      }
      return ShapeRegistry.get(this.data.type);
    }
    /**
     * Render the SVG shape
     */
    renderShape() {
      const shapeDef = this.getShapeDefinition();
      if (!shapeDef) {
        return b2`
        <div class="unknown-shape">
          Unknown shape: ${this.data?.type || "undefined"}
        </div>
      `;
      }
      const config = this.data;
      const size = config.size || shapeDef.defaultSize;
      const fillColor = config.backgroundColor || config.color || "#ffffff";
      const strokeColor = config.strokeColor || "#000000";
      const strokeWidth = config.strokeWidth || 2;
      const rotation = config.rotation || 0;
      return b2`
      <svg 
        class="shape-svg"
        width="${size.width}" 
        height="${size.height}" 
        viewBox="${shapeDef.viewBox}"
        style="transform: rotate(${rotation}deg)"
      >
        <path 
          d="${shapeDef.path}" 
          fill="${fillColor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
        />
      </svg>
    `;
    }
    /**
     * Render gradient definitions if needed
     */
    renderGradients() {
      const config = this.data;
      if (config && "gradient" in config && config.gradient) {
        const gradientId = `gradient-${this.data.type}-${Math.random().toString(36).substr(2, 9)}`;
        const gradient = config.gradient;
        if (gradient.type === "linear") {
          return b2`
          <defs>
            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
              ${gradient.colors.map(
            (color2, index) => b2`<stop offset="${index / (gradient.colors.length - 1) * 100}%" stop-color="${color2}"/>`
          )}
            </linearGradient>
          </defs>
        `;
        } else if (gradient.type === "radial") {
          return b2`
          <defs>
            <radialGradient id="${gradientId}" cx="50%" cy="50%" r="50%">
              ${gradient.colors.map(
            (color2, index) => b2`<stop offset="${index / (gradient.colors.length - 1) * 100}%" stop-color="${color2}"/>`
          )}
            </radialGradient>
          </defs>
        `;
        }
      }
      return b2``;
    }
    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("click", this.handleClick);
      this.addEventListener("mousedown", this.handleMouseDown);
      if (this.resizable) {
        this.addEventListener("resize", this.handleResize);
        this.addEventListener("resize-end", this.handleResizeEnd);
      }
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener("click", this.handleClick);
      this.removeEventListener("mousedown", this.handleMouseDown);
      if (this.resizable) {
        this.removeEventListener("resize", this.handleResize);
        this.removeEventListener("resize-end", this.handleResizeEnd);
      }
      this.cleanup();
    }
    cleanup() {
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", this.handleMouseUp);
    }
    render() {
      this.style.setProperty("--position-x", `${this.position.x}px`);
      this.style.setProperty("--position-y", `${this.position.y}px`);
      const shapeDef = this.getShapeDefinition();
      const config = this.data;
      const size = config?.size || shapeDef?.defaultSize || { width: 200, height: 200 };
      this.style.setProperty("--shape-width", `${size.width}px`);
      this.style.setProperty("--shape-height", `${size.height}px`);
      return b2`
      <div class="shape-node ${this.selected ? "selected" : ""}">
        ${this.renderGradients()}
        ${this.renderShape()}
        <div class="shape-content">
          <slot></slot>
        </div>
        ${this.connectable ? this.renderHandles() : ""}
        ${this.renderLabel()}
      </div>
      ${this.resizable ? b2`
        <node-resizer
          .visible=${this.selected}
          min-width="50"
          min-height="50"
          max-width="500"
          max-height="500"
        ></node-resizer>
      ` : ""}
    `;
    }
    renderHandles() {
      const nodeId = this.id;
      return b2`
      <div 
        class="handle source" 
        data-handle="source" 
        data-node-id="${nodeId}"
        data-handle-id="${nodeId}-source-right"
        data-handle-type="source"
        @mousedown=${this.handleHandleStart}
      ></div>
      <div 
        class="handle target" 
        data-handle="target" 
        data-node-id="${nodeId}"
        data-handle-id="${nodeId}-target-left"
        data-handle-type="target"
        @mousedown=${this.handleHandleStart}
      ></div>
      <div 
        class="handle top" 
        data-handle="source" 
        data-node-id="${nodeId}"
        data-handle-id="${nodeId}-source-top"
        data-handle-type="source"
        @mousedown=${this.handleHandleStart}
      ></div>
      <div 
        class="handle bottom" 
        data-handle="target" 
        data-node-id="${nodeId}"
        data-handle-id="${nodeId}-target-bottom"
        data-handle-type="target"
        @mousedown=${this.handleHandleStart}
      ></div>
    `;
    }
    renderLabel() {
      const shapeConfig = this.data;
      if (!shapeConfig) return "";
      const label = shapeConfig.label || shapeConfig.type;
      return b2`
      <div class="shape-label">
        ${label}
      </div>
    `;
    }
  };
  ShapeNode.styles = i`
    :host {
      position: absolute;
      display: block;
      pointer-events: auto;
      transform-origin: 0 0;
      will-change: transform;
      transform: translate(var(--position-x, 0px), var(--position-y, 0px));
    }

    .shape-node {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      user-select: none;
      pointer-events: auto;
      width: var(--shape-width, 200px);
      height: var(--shape-height, 200px);
    }

    .shape-node:active {
      cursor: grabbing;
    }

    .shape-node.selected {
      outline: 2px solid var(--flow-node-selected-color, #1a73e8);
      outline-offset: 2px;
    }

    :host([dragging]) .shape-node {
      cursor: grabbing;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
    }

    .shape-svg {
      display: block;
      transition: transform 0.2s ease;
      pointer-events: none;
    }

    .shape-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
    }

    .shape-node:hover .shape-svg {
      transform: scale(1.05);
    }

    .unknown-shape {
      width: 100px;
      height: 100px;
      background: #f0f0f0;
      border: 2px dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
      pointer-events: none;
    }

    .handle {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--flow-handle-bg, #fff);
      border: 1px solid var(--flow-handle-border, #1a73e8);
      box-shadow: 0 0 0 1px rgba(26, 115, 232, 0.15);
      cursor: crosshair;
      pointer-events: auto;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .handle:hover {
      opacity: 1;
      transform: scale(1.2);
    }

    .handle.source {
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
    }

    .handle.target {
      left: -5px;
      top: 50%;
      transform: translateY(-50%);
    }

    .handle.top {
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
    }

    .handle.bottom {
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
    }

    .shape-node:hover .handle {
      opacity: 1;
    }

    .shape-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 12px;
      color: #333;
      white-space: nowrap;
      user-select: none;
      pointer-events: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 5;
    }

    .shape-label.editable {
      pointer-events: auto;
      cursor: text;
    }

    .shape-label.editable:hover {
      background: rgba(255, 255, 255, 1);
      border-color: var(--flow-node-selected-color, #1a73e8);
    }

    .handle:active {
      opacity: 1;
      transform: scale(1.3);
    }
  `;
  __decorateClass$2([
    n5({ type: String, reflect: true })
  ], ShapeNode.prototype, "id", 2);
  __decorateClass$2([
    n5({ type: Object })
  ], ShapeNode.prototype, "data", 2);
  __decorateClass$2([
    n5({
      type: Object,
      hasChanged: (newVal, oldVal) => {
        return !oldVal || newVal.x !== oldVal.x || newVal.y !== oldVal.y;
      }
    })
  ], ShapeNode.prototype, "position", 2);
  __decorateClass$2([
    n5({ type: Boolean, reflect: true })
  ], ShapeNode.prototype, "selected", 2);
  __decorateClass$2([
    n5({ type: Boolean, reflect: true })
  ], ShapeNode.prototype, "dragging", 2);
  __decorateClass$2([
    n5({ type: Boolean })
  ], ShapeNode.prototype, "draggable", 2);
  __decorateClass$2([
    n5({ type: Boolean })
  ], ShapeNode.prototype, "connectable", 2);
  __decorateClass$2([
    n5({ type: Object })
  ], ShapeNode.prototype, "instance", 2);
  __decorateClass$2([
    n5({ type: Boolean })
  ], ShapeNode.prototype, "resizable", 2);
  ShapeNode = __decorateClass$2([
    t3("shape-node")
  ], ShapeNode);
  var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
  var __decorateClass$1 = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc2(target, key) : target;
    for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
      if (decorator = decorators[i7])
        result = decorator(result) || result;
    return result;
  };
  var BaseNode = class extends i4 {
    render() {
      return b2`<slot></slot>`;
    }
  };
  BaseNode.styles = i`
    :host {
      display: block;
      border: 1px solid var(--flow-node-border, #e5e7eb);
      border-radius: 8px;
      background: var(--flow-node-background, #ffffff);
      color: var(--flow-node-foreground, #111827);
      overflow: hidden;
    }
  `;
  BaseNode = __decorateClass$1([
    t3("base-node")
  ], BaseNode);
  var BaseNodeHeader = class extends i4 {
    render() {
      return b2`<slot></slot>`;
    }
  };
  BaseNodeHeader.styles = i`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--base-node-header-bg, #f9fafb);
      border-bottom: 1px solid var(--flow-node-border, #e5e7eb);
      font-weight: 600;
    }
  `;
  BaseNodeHeader = __decorateClass$1([
    t3("base-node-header")
  ], BaseNodeHeader);
  var BaseNodeHeaderTitle = class extends i4 {
    render() {
      return b2`<span class="title"><slot></slot></span>`;
    }
  };
  BaseNodeHeaderTitle.styles = i`
    :host { display: contents; }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: var(--base-node-title, #111827);
    }
  `;
  BaseNodeHeaderTitle = __decorateClass$1([
    t3("base-node-header-title")
  ], BaseNodeHeaderTitle);
  var BaseNodeContent = class extends i4 {
    render() {
      return b2`<slot></slot>`;
    }
  };
  BaseNodeContent.styles = i`
    :host {
      display: block;
      padding: 12px;
    }
  `;
  BaseNodeContent = __decorateClass$1([
    t3("base-node-content")
  ], BaseNodeContent);
  var BaseNodeFooter = class extends i4 {
    render() {
      return b2`<slot></slot>`;
    }
  };
  BaseNodeFooter.styles = i`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--base-node-footer-bg, #fafafa);
      border-top: 1px solid var(--flow-node-border, #e5e7eb);
    }
  `;
  BaseNodeFooter = __decorateClass$1([
    t3("base-node-footer")
  ], BaseNodeFooter);

  // src/graphCanvasLitFlow/client/graphCanvasMinimap.ts
  var minimapCleanups = /* @__PURE__ */ new WeakMap();
  function nodeSize(node) {
    return {
      width: node.measured?.width ?? node.width ?? 240,
      height: node.measured?.height ?? node.height ?? 96
    };
  }
  function computeGraphBounds(nodes) {
    if (nodes.length === 0) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const { width, height } = nodeSize(node);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    }
    const pad = 28;
    return {
      minX: minX - pad,
      minY: minY - pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2)
    };
  }
  function buildMinimapTransform(bounds, width, height) {
    const scale = Math.min(width / bounds.width, height / bounds.height);
    const offsetX = (width - bounds.width * scale) / 2;
    const offsetY = (height - bounds.height * scale) / 2;
    return { bounds, scale, offsetX, offsetY };
  }
  function graphToMinimap(transform2, x2, y3) {
    return {
      x: transform2.offsetX + (x2 - transform2.bounds.minX) * transform2.scale,
      y: transform2.offsetY + (y3 - transform2.bounds.minY) * transform2.scale
    };
  }
  function minimapToGraph(transform2, x2, y3) {
    return {
      x: transform2.bounds.minX + (x2 - transform2.offsetX) / transform2.scale,
      y: transform2.bounds.minY + (y3 - transform2.offsetY) / transform2.scale
    };
  }
  function createSvgElement(tag, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value);
    }
    return element;
  }
  function mountGraphCanvasMinimap(host, getCanvas, options = {}) {
    minimapCleanups.get(host)?.();
    const width = options.width ?? 168;
    const height = options.height ?? 108;
    host.replaceChildren();
    host.classList.add("graph-canvas-minimap");
    host.dataset.theme = options.theme ?? "light";
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", "Graph overview");
    const svg = createSvgElement("svg", {
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`
    });
    const nodesLayer = createSvgElement("g", { class: "graph-canvas-minimap-nodes" });
    const viewportLayer = createSvgElement("rect", {
      class: "graph-canvas-minimap-viewport",
      "pointer-events": "none"
    });
    svg.appendChild(nodesLayer);
    svg.appendChild(viewportLayer);
    host.appendChild(svg);
    let unsubscribe = null;
    let rafId = 0;
    let latestTransform = null;
    const schedulePaint = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(paint);
    };
    const paint = () => {
      const canvas = getCanvas();
      const instance = canvas?.instance;
      if (!instance) {
        nodesLayer.replaceChildren();
        viewportLayer.setAttribute("width", "0");
        viewportLayer.setAttribute("height", "0");
        return;
      }
      const { nodes } = instance.getState();
      const bounds = computeGraphBounds(nodes);
      if (!bounds) {
        nodesLayer.replaceChildren();
        viewportLayer.setAttribute("width", "0");
        viewportLayer.setAttribute("height", "0");
        return;
      }
      latestTransform = buildMinimapTransform(bounds, width, height);
      nodesLayer.replaceChildren();
      for (const node of nodes) {
        const size = nodeSize(node);
        const topLeft = graphToMinimap(latestTransform, node.position.x, node.position.y);
        const rect = createSvgElement("rect", {
          class: "graph-canvas-minimap-node",
          x: String(topLeft.x),
          y: String(topLeft.y),
          width: String(Math.max(2, size.width * latestTransform.scale)),
          height: String(Math.max(2, size.height * latestTransform.scale)),
          rx: "2"
        });
        nodesLayer.appendChild(rect);
      }
      const container = instance.container ?? canvas;
      const viewport = instance.getViewport();
      const zoom = viewport.zoom || 1;
      const visibleX = -viewport.x / zoom;
      const visibleY = -viewport.y / zoom;
      const visibleWidth = container.clientWidth / zoom;
      const visibleHeight = container.clientHeight / zoom;
      const viewportTopLeft = graphToMinimap(latestTransform, visibleX, visibleY);
      const viewportBottomRight = graphToMinimap(
        latestTransform,
        visibleX + visibleWidth,
        visibleY + visibleHeight
      );
      viewportLayer.setAttribute("x", String(viewportTopLeft.x));
      viewportLayer.setAttribute("y", String(viewportTopLeft.y));
      viewportLayer.setAttribute("width", String(Math.max(2, viewportBottomRight.x - viewportTopLeft.x)));
      viewportLayer.setAttribute("height", String(Math.max(2, viewportBottomRight.y - viewportTopLeft.y)));
    };
    const bindInstance = () => {
      unsubscribe?.();
      unsubscribe = null;
      const canvas = getCanvas();
      const instance = canvas?.instance;
      if (!instance?.subscribe) {
        window.requestAnimationFrame(bindInstance);
        return;
      }
      unsubscribe = instance.subscribe(schedulePaint);
      schedulePaint();
    };
    const onPointerDown = (event) => {
      if (!latestTransform) {
        return;
      }
      const canvas = getCanvas();
      const instance = canvas?.instance;
      if (!instance) {
        return;
      }
      const rect = svg.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const graphPoint = minimapToGraph(latestTransform, localX, localY);
      const container = instance.container ?? canvas;
      const viewport = instance.getViewport();
      const zoom = viewport.zoom || 1;
      instance.setViewport({
        x: container.clientWidth / 2 - graphPoint.x * zoom,
        y: container.clientHeight / 2 - graphPoint.y * zoom,
        zoom
      });
      event.preventDefault();
    };
    svg.addEventListener("pointerdown", onPointerDown);
    const cleanup = () => {
      window.cancelAnimationFrame(rafId);
      unsubscribe?.();
      unsubscribe = null;
      svg.removeEventListener("pointerdown", onPointerDown);
      host.replaceChildren();
    };
    minimapCleanups.set(host, cleanup);
    bindInstance();
    return cleanup;
  }
  function unmountGraphCanvasMinimap(host) {
    minimapCleanups.get(host)?.();
    minimapCleanups.delete(host);
  }

  // src/graphCanvasLitFlow/graphCanvasEdgeLabels.mjs
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function buildGraphCanvasEdgeLabelHtml(label, theme, options = {}) {
    const text = String(label ?? "").trim();
    if (text === "") {
      return "";
    }
    const rejected = options.rejected === true;
    const palette = theme === "light" ? {
      bg: rejected ? "#f4f5f7" : "#ffffff",
      border: rejected ? "#dfe1e6" : "#c1c7d0",
      color: rejected ? "#97a0af" : "#5e6c84"
    } : {
      bg: rejected ? "#2a2a2a" : "#2d2d30",
      border: rejected ? "#3c3c3c" : "#4a4a4a",
      color: rejected ? "#6e6e6e" : "#9d9d9d"
    };
    return `<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;line-height:1.25;font-family:Segoe UI,system-ui,sans-serif;background:${palette.bg};border:1px solid ${palette.border};color:${palette.color};${rejected ? "opacity:0.75;font-style:italic;" : ""}">${escapeHtml(text)}</span>`;
  }
  function buildGraphCanvasEdgeStrokeStyle(edge, theme) {
    const rejected = edge.rejected === true;
    const upstream = edge.upstream === true;
    const stroke = rejected ? theme === "light" ? "#c1c7d0" : "#555555" : upstream ? theme === "light" ? "#97a0af" : "#6e6e6e" : theme === "light" ? "#8b8b95" : "#858585";
    return {
      stroke,
      strokeWidth: rejected ? 1.5 : 2,
      ...rejected ? { strokeDasharray: "6 4", opacity: 0.42 } : {},
      ...upstream && !rejected ? { strokeDasharray: "5 4", opacity: 0.72 } : {}
    };
  }

  // src/graphCanvasLitFlow/graphCanvasEdgeRouter.mjs
  function anchorX(node, targetCenterX) {
    const ratio = (targetCenterX - node.x) / Math.max(node.width, 1);
    return node.x + node.width * Math.max(0.15, Math.min(0.85, ratio));
  }
  function buildGraphCanvasEdgeGeometry(edge, layoutDirection = "LR") {
    const from = edge.fromNode;
    const to = edge.toNode;
    const fromCy = from.y + from.height / 2;
    const toCy = to.y + to.height / 2;
    const toCx = to.x + to.width / 2;
    const fromCx = from.x + from.width / 2;
    let startX;
    let startY;
    let endX;
    let endY;
    let orientation;
    if (layoutDirection === "LR") {
      const goesRight = to.x > from.x + from.width - 8;
      if (goesRight) {
        orientation = "horizontal";
        startX = from.x + from.width;
        startY = fromCy;
        endX = to.x;
        endY = toCy;
      } else if (toCy > fromCy + 8) {
        orientation = "vertical";
        startX = anchorX(from, toCx);
        endX = anchorX(to, fromCx);
        startY = from.y + from.height;
        endY = to.y;
      } else {
        orientation = "vertical-reverse";
        startX = anchorX(from, toCx);
        endX = anchorX(to, fromCx);
        startY = from.y;
        endY = to.y + to.height;
      }
    } else {
      const goesDown = toCy > fromCy + 8;
      if (goesDown) {
        orientation = "vertical";
        startX = anchorX(from, toCx);
        endX = anchorX(to, fromCx);
        startY = from.y + from.height;
        endY = to.y;
      } else if (to.x >= from.x + from.width - 8) {
        orientation = "horizontal";
        startX = from.x + from.width;
        startY = fromCy;
        endX = to.x;
        endY = toCy;
      } else {
        orientation = "horizontal-reverse";
        startX = from.x;
        startY = fromCy;
        endX = to.x + to.width;
        endY = toCy;
      }
    }
    const dy = endY - startY;
    const dx = endX - startX;
    const bend = Math.max(28, Math.min(72, (Math.abs(dx) + Math.abs(dy)) * 0.22));
    const d3 = orientation === "vertical" || orientation === "vertical-reverse" ? `M ${startX} ${startY} C ${startX} ${startY + Math.sign(dy || 1) * bend}, ${endX} ${endY - Math.sign(dy || 1) * bend}, ${endX} ${endY}` : (() => {
      const midX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    })();
    const label = String(edge.label ?? "").trim();
    const hideLabel = orientation === "vertical" && label === "\u043F\u043E\u0434\u0437\u0430\u0434\u0430\u0447\u0430";
    return {
      d: d3,
      startX,
      startY,
      endX,
      endY,
      orientation,
      rejected: edge.rejected === true,
      upstream: edge.upstream === true,
      label: hideLabel ? "" : label,
      labelX: (startX + endX) / 2,
      labelY: orientation === "horizontal" || orientation === "horizontal-reverse" ? Math.min(startY, endY) - 10 : startY + (endY - startY) / 2,
      labelPlacement: orientation === "horizontal" && to.x > from.x + from.width * 0.35 ? "start" : "center"
    };
  }
  function buildGraphCanvasEdgeRoutes(projection) {
    const layoutDirection = projection?.layoutDirection ?? "LR";
    const nodeById = new Map((projection?.nodes ?? []).map((node) => [node.id, node]));
    const routes = [];
    for (const edge of projection?.edges ?? []) {
      const fromNode = nodeById.get(edge.from);
      const toNode = nodeById.get(edge.to);
      if (!fromNode || !toNode) {
        continue;
      }
      routes.push({
        id: edge.id ?? `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        ...buildGraphCanvasEdgeGeometry({ ...edge, fromNode, toNode }, layoutDirection)
      });
    }
    return routes;
  }

  // src/graphCanvasLitFlow/client/graphCanvasSvgEdges.ts
  var svgEdgeLayers = /* @__PURE__ */ new WeakMap();
  function resolveGraphCanvasTheme() {
    return document.body?.dataset?.theme === "dark" ? "dark" : "light";
  }
  function buildPaintKey(projection, theme) {
    return `${theme}:${projection.layoutDirection ?? "LR"}:${projection.edges.length}:${projection.nodes.length}`;
  }
  function buildMarkerDefs(theme) {
    const color2 = theme === "dark" ? "#858585" : "#8b8b95";
    return `
    <defs>
      <marker id="wg-edge-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color2}" />
      </marker>
      <marker id="wg-edge-arrow-upstream" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color2}" opacity="0.72" />
      </marker>
      <marker id="wg-edge-arrow-rejected" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color2}" opacity="0.42" />
      </marker>
    </defs>
  `;
  }
  function paintSvgEdges(layer, projection, theme, force = false) {
    const paintKey = buildPaintKey(projection, theme);
    if (!force && layer.paintKey === paintKey) {
      return;
    }
    const routes = buildGraphCanvasEdgeRoutes(projection);
    const paths = routes.map((route) => {
      const stroke = buildGraphCanvasEdgeStrokeStyle(
        { rejected: route.rejected, upstream: route.upstream },
        theme
      );
      const marker = route.rejected ? "url(#wg-edge-arrow-rejected)" : route.upstream ? "url(#wg-edge-arrow-upstream)" : "url(#wg-edge-arrow)";
      const dash = route.rejected ? 'stroke-dasharray="6 4" opacity="0.42"' : route.upstream ? 'stroke-dasharray="5 4" opacity="0.72"' : "";
      return `<path class="graph-canvas-edge-path" data-edge-id="${route.id}" d="${route.d}" fill="none" stroke="${stroke.stroke}" stroke-width="${route.rejected ? 1.75 : 2.25}" marker-end="${marker}" ${dash} />`;
    }).join("");
    layer.svg.innerHTML = `${buildMarkerDefs(theme)}<g class="graph-canvas-edge-paths">${paths}</g>`;
    layer.labelsLayer.replaceChildren();
    for (const route of routes) {
      if (!route.label) {
        continue;
      }
      const labelHtml = buildGraphCanvasEdgeLabelHtml(route.label, theme, { rejected: route.rejected });
      if (!labelHtml) {
        continue;
      }
      const label = document.createElement("div");
      label.className = "graph-canvas-edge-label";
      label.style.left = `${route.labelX}px`;
      label.style.top = `${route.labelY}px`;
      if (route.labelPlacement === "start") {
        label.style.transform = "translate(8px, -50%)";
      } else {
        label.style.transform = "translate(-50%, -50%)";
      }
      label.innerHTML = labelHtml;
      layer.labelsLayer.appendChild(label);
    }
    layer.paintKey = paintKey;
  }
  function createSvgEdgeHost() {
    const host = document.createElement("div");
    host.className = "graph-canvas-wg-edges-layer";
    host.dataset.testid = "graph-canvas-svg-edges";
    host.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible;";
    return host;
  }
  function createSvgEdgeLayer(host) {
    host.replaceChildren();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "graph-canvas-svg-edges-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;inset:0;overflow:visible;display:block;";
    const labelsLayer = document.createElement("div");
    labelsLayer.className = "graph-canvas-svg-edge-labels";
    labelsLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    host.appendChild(svg);
    host.appendChild(labelsLayer);
    return {
      host,
      svg,
      labelsLayer,
      observer: null,
      paintKey: ""
    };
  }
  function getFlowViewport(canvas) {
    return canvas.shadowRoot?.querySelector(".flow-viewport") ?? null;
  }
  function restoreSvgEdgeLayerIfMissing(canvas, projection) {
    const viewport = getFlowViewport(canvas);
    const nodesLayer = viewport?.querySelector(".flow-nodes-layer");
    if (!viewport || !nodesLayer) {
      return null;
    }
    let layer = svgEdgeLayers.get(canvas);
    if (layer?.host.isConnected && viewport.contains(layer.host)) {
      return layer;
    }
    const host = createSvgEdgeHost();
    viewport.insertBefore(host, nodesLayer);
    layer = createSvgEdgeLayer(host);
    svgEdgeLayers.set(canvas, layer);
    paintSvgEdges(layer, projection, resolveGraphCanvasTheme(), true);
    return layer;
  }
  function watchForSvgEdgeHostRemoval(canvas, projection) {
    const root2 = canvas.shadowRoot;
    if (!root2) {
      return;
    }
    const existing = svgEdgeLayers.get(canvas);
    existing?.observer?.disconnect();
    let restoring = false;
    const observer = new MutationObserver(() => {
      if (restoring) {
        return;
      }
      const viewport = getFlowViewport(canvas);
      if (!viewport?.querySelector(".flow-nodes-layer")) {
        return;
      }
      if (viewport.querySelector(".graph-canvas-wg-edges-layer")) {
        return;
      }
      restoring = true;
      try {
        restoreSvgEdgeLayerIfMissing(canvas, projection);
      } finally {
        restoring = false;
      }
    });
    observer.observe(root2, { childList: true, subtree: true });
    const layer = svgEdgeLayers.get(canvas);
    if (layer) {
      layer.observer = observer;
    }
  }
  function injectFlowCanvasNativeEdgeHide(canvas) {
    const root2 = canvas.shadowRoot;
    if (!root2 || root2.querySelector("[data-wg-hide-native-edges]")) {
      return;
    }
    const style = document.createElement("style");
    style.setAttribute("data-wg-hide-native-edges", "true");
    style.textContent = `
    .flow-edges-layer,
    .flow-labels-overlay {
      display: none !important;
    }
  `;
    root2.appendChild(style);
  }
  function mountGraphCanvasSvgEdges(canvas, projection) {
    unmountGraphCanvasSvgEdges(canvas);
    let attempts = 0;
    const tryMount = () => {
      const layer = restoreSvgEdgeLayerIfMissing(canvas, projection);
      if (!layer) {
        attempts += 1;
        if (attempts < 120) {
          window.requestAnimationFrame(tryMount);
        }
        return;
      }
      watchForSvgEdgeHostRemoval(canvas, projection);
    };
    tryMount();
    return () => unmountGraphCanvasSvgEdges(canvas);
  }
  function unmountGraphCanvasSvgEdges(canvas) {
    const layer = svgEdgeLayers.get(canvas);
    if (!layer) {
      return;
    }
    layer.observer?.disconnect();
    layer.host.remove();
    svgEdgeLayers.delete(canvas);
  }
  function repaintGraphCanvasSvgEdges(canvas, projection) {
    const layer = restoreSvgEdgeLayerIfMissing(canvas, projection);
    if (!layer) {
      return;
    }
    paintSvgEdges(layer, projection, resolveGraphCanvasTheme(), true);
  }

  // src/graphCanvasLitFlow/graphCanvasProjectionToFlow.mjs
  function buildFlowEdgeHandles(edge, layoutNodes) {
    const from = layoutNodes.find((node) => node.id === edge.from);
    const to = layoutNodes.find((node) => node.id === edge.to);
    if (!from || !to) {
      return { sourceHandle: "source", targetHandle: "target", edgeType: "default" };
    }
    const dx = (to.x ?? 0) - (from.x ?? 0);
    const dy = (to.y ?? 0) - (from.y ?? 0);
    const horizontal = dx > (from.width ?? 0) * 0.35;
    const verticalDown = !horizontal && dy > 12;
    if (verticalDown) {
      return {
        sourceHandle: "source-bottom",
        targetHandle: "target-top",
        edgeType: "smoothstep"
      };
    }
    if (horizontal) {
      return {
        sourceHandle: "source",
        targetHandle: "target",
        edgeType: "default"
      };
    }
    return { sourceHandle: "source", targetHandle: "target", edgeType: "default" };
  }
  function buildFlowEdgeLabelFields(edge, layoutNodes, theme) {
    const label = String(edge.label ?? "").trim();
    if (label === "") {
      return {};
    }
    const from = layoutNodes.find((node) => node.id === edge.from);
    const to = layoutNodes.find((node) => node.id === edge.to);
    const html = buildGraphCanvasEdgeLabelHtml(label, theme, { rejected: edge.rejected === true });
    const handles = buildFlowEdgeHandles(edge, layoutNodes);
    if (handles.edgeType === "smoothstep" && label === "\u043F\u043E\u0434\u0437\u0430\u0434\u0430\u0447\u0430") {
      return {};
    }
    if (handles.edgeType === "default" && (to?.x ?? 0) > (from?.x ?? 0) + (from?.width ?? 0) * 0.35) {
      return { startLabel: label, startLabelHtml: html };
    }
    return {};
  }
  function graphCanvasProjectionToFlow(projection, options = {}) {
    const theme = options.theme === "light" ? "light" : "dark";
    const layoutNodes = projection?.nodes ?? [];
    const nodes = (projection?.nodes ?? []).map((node) => ({
      id: node.id,
      type: "graph-card",
      position: { x: node.x, y: node.y },
      data: {
        kind: node.kind,
        title: node.title,
        layer: node.layer ?? "",
        summary: node.summary ?? "",
        status: node.status ?? "",
        selected: node.selected === true,
        rejected: node.rejected === true,
        focused: node.focused === true,
        taskId: node.taskId ?? "",
        intentNodeId: node.intentNodeId ?? "",
        blockId: node.blockId ?? "",
        schematicId: node.schematicId ?? "",
        doneChildCount: node.doneChildCount ?? 0,
        childCount: node.childCount ?? 0
      },
      width: node.width,
      height: node.height,
      draggable: false,
      selectable: true
    }));
    const edges = (projection?.edges ?? []).map((edge) => {
      const rejected = edge.rejected === true;
      const handles = buildFlowEdgeHandles(edge, layoutNodes);
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        label: "",
        type: handles.edgeType,
        animated: false,
        selectable: false,
        markerEnd: {
          type: "ArrowClosed",
          width: 14,
          height: 14,
          color: buildGraphCanvasEdgeStrokeStyle(edge, theme).stroke
        },
        data: {
          rejected,
          upstream: edge.upstream === true,
          ...buildFlowEdgeLabelFields(edge, layoutNodes, theme)
        },
        style: {
          ...buildGraphCanvasEdgeStrokeStyle(edge, theme),
          strokeWidth: rejected ? 1.75 : 2.25
        }
      };
    });
    return { nodes, edges };
  }

  // src/graphCanvasLitFlow/graphCanvasTraversal.mjs
  function buildEdgeMaps(edges) {
    const outgoing = /* @__PURE__ */ new Map();
    const incoming = /* @__PURE__ */ new Map();
    for (const edge of edges ?? []) {
      if (!edge?.from || !edge?.to) {
        continue;
      }
      if (!outgoing.has(edge.from)) {
        outgoing.set(edge.from, /* @__PURE__ */ new Set());
      }
      if (!incoming.has(edge.to)) {
        incoming.set(edge.to, /* @__PURE__ */ new Set());
      }
      outgoing.get(edge.from).add(edge.to);
      incoming.get(edge.to).add(edge.from);
    }
    return { outgoing, incoming };
  }
  function getOutgoingNodeIds(nodeId, edges) {
    const { outgoing } = buildEdgeMaps(edges);
    return [...outgoing.get(nodeId) ?? []];
  }
  function getIncomingNodeIds(nodeId, edges) {
    const { incoming } = buildEdgeMaps(edges);
    return [...incoming.get(nodeId) ?? []];
  }
  function getUpstreamNodeIds(nodeId, edges, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(nodeId)) {
      return [];
    }
    visited.add(nodeId);
    const direct = getIncomingNodeIds(nodeId, edges);
    const nested = direct.flatMap((id2) => getUpstreamNodeIds(id2, edges, visited));
    return [.../* @__PURE__ */ new Set([...direct, ...nested])];
  }
  function getDownstreamNodeIds(nodeId, edges, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(nodeId)) {
      return [];
    }
    visited.add(nodeId);
    const direct = getOutgoingNodeIds(nodeId, edges);
    const nested = direct.flatMap((id2) => getDownstreamNodeIds(id2, edges, visited));
    return [.../* @__PURE__ */ new Set([...direct, ...nested])];
  }
  function sortNodeIdsByVerticalPosition(nodeIds, nodes) {
    const byId = new Map((nodes ?? []).map((node) => [node.id, node]));
    return [...nodeIds].sort((left, right) => {
      const leftNode = byId.get(left);
      const rightNode = byId.get(right);
      const dy = (leftNode?.y ?? 0) - (rightNode?.y ?? 0);
      if (dy !== 0) {
        return dy;
      }
      return String(left).localeCompare(String(right), "en");
    });
  }
  function getSiblingNodeIds(nodeId, edges, nodes) {
    const parents = getIncomingNodeIds(nodeId, edges);
    if (parents.length === 0) {
      return [];
    }
    const siblings = parents.flatMap((parentId) => getOutgoingNodeIds(parentId, edges));
    return sortNodeIdsByVerticalPosition(
      siblings.filter((id2) => id2 !== nodeId),
      nodes
    );
  }

  // src/graphCanvasLitFlow/client/graphCardNode.ts
  var KIND_LAYER_TONE = {
    intent_question: "tone-question",
    intent_analysis: "tone-analysis",
    intent_option: "tone-option",
    intent_decision: "tone-decision",
    work_item: "tone-work",
    work_epic: "tone-epic",
    architecture_block: "tone-architecture",
    schematic_block: "tone-schematic"
  };
  function statusBadgeClass(status) {
    const value = String(status ?? "").trim().toLowerCase();
    if (value === "done" || value === "verified") {
      return "is-done";
    }
    if (value === "blocked") {
      return "is-blocked";
    }
    if (value === "doing" || value === "in_progress" || value === "claimed") {
      return "is-doing";
    }
    if (value === "ready") {
      return "is-ready";
    }
    return "is-neutral";
  }
  var GraphCardNode = class extends FlowNode {
    static styles = [
      ...Array.isArray(FlowNode.styles) ? FlowNode.styles : [FlowNode.styles],
      i`
      :host {
        --node-background: var(--wg-graph-node-bg, #ffffff);
        --node-border: var(--wg-graph-node-border, #dfe1e6);
        --node-text: var(--wg-graph-node-text, #172b4d);
        --node-subtext: var(--wg-graph-node-subtext, #5e6c84);
        --node-selected-border: var(--wg-graph-node-selected-border, #0052cc);
        background: transparent;
        border: none;
        border-radius: 0;
        box-shadow: none;
        font-family: "Segoe UI", system-ui, sans-serif;
        padding: 0;
      }

      :host(:hover),
      :host([selected]),
      :host([dragging]) {
        box-shadow: none;
      }

      .graph-card {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 10px 12px 11px;
        border: 1px solid var(--node-border);
        border-radius: 10px;
        background: var(--node-background);
        color: var(--node-text);
        text-align: left;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(9, 30, 66, 0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      }

      .graph-card:hover {
        border-color: var(--wg-graph-node-hover-border, #c1c7d0);
      }

      :host([selected]) .graph-card,
      .graph-card.is-focused,
      .graph-card.is-selected:not(.is-rejected) {
        border-color: var(--node-selected-border);
        box-shadow: none;
      }

      .graph-card.is-rejected {
        opacity: 0.58;
        border-style: dashed;
        background: var(--wg-graph-node-rejected-bg, #f4f5f7);
        box-shadow: none;
      }

      .graph-card.tone-question {
        border-left: 3px solid var(--wg-graph-tone-question, #0052cc);
      }

      .graph-card.tone-analysis {
        border-left: 3px solid var(--wg-graph-tone-analysis, #5b21b6);
      }

      .graph-card.tone-option.is-selected:not(.is-rejected) {
        background: var(--wg-graph-node-selected-bg, linear-gradient(180deg, #deebff 0%, #ffffff 72%));
      }

      .graph-card.tone-decision {
        border-left: 3px solid var(--wg-graph-tone-decision, #9a6700);
      }

      .graph-card.tone-work.is-done {
        border-color: var(--wg-graph-tone-work, #1a7f37);
      }

      .graph-card.tone-epic {
        border-left: 3px solid var(--wg-graph-tone-epic, #8250df);
      }

      .graph-card.tone-epic.is-done {
        border-color: var(--wg-graph-tone-work, #1a7f37);
      }

      .graph-card.tone-epic:not(.is-done) .status-badge.is-ready {
        background: rgba(130, 80, 223, 0.18);
      }

      .graph-card.tone-architecture,
      .graph-card.tone-schematic {
        border-left: 3px solid var(--wg-graph-tone-architecture, #0052cc);
      }

      .layer {
        display: inline-block;
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--node-subtext);
        margin-bottom: 7px;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--wg-graph-layer-bg, rgba(9, 30, 66, 0.05));
        border: 1px solid var(--wg-graph-layer-border, rgba(9, 30, 66, 0.1));
      }

      .tone-question .layer {
        color: var(--wg-graph-tone-question, #0052cc);
      }

      .tone-analysis .layer {
        color: var(--wg-graph-tone-analysis, #5b21b6);
      }

      .tone-option.is-selected:not(.is-rejected) .layer {
        color: var(--wg-graph-tone-question, #0052cc);
      }

      .tone-decision .layer {
        color: var(--wg-graph-tone-decision, #9a6700);
      }

      .tone-work .layer {
        color: var(--wg-graph-tone-work, #1a7f37);
      }

      .tone-epic .layer {
        color: var(--wg-graph-tone-epic, #8250df);
      }

      .title {
        font-size: 13px;
        line-height: 1.35;
        font-weight: 600;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .summary {
        font-size: 12px;
        line-height: 1.35;
        color: var(--node-subtext);
        margin: 6px 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .status-row {
        margin-top: 9px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 1.4;
        text-transform: lowercase;
        border: 1px solid var(--wg-graph-badge-border, #dfe1e6);
        color: var(--node-subtext);
        background: var(--wg-graph-badge-bg, #f4f5f7);
      }

      .status-badge.is-done {
        border-color: var(--wg-graph-badge-done-border, #abf5d1);
        color: var(--wg-graph-badge-done-text, #006644);
        background: var(--wg-graph-badge-done-bg, #e3fcef);
      }

      .status-badge.is-doing {
        border-color: var(--wg-graph-badge-doing-border, #f0c36d);
        color: var(--wg-graph-badge-doing-text, #7a4f01);
        background: var(--wg-graph-badge-doing-bg, #fff7d6);
      }

      .status-badge.is-ready {
        border-color: var(--wg-graph-badge-ready-border, #85b8ff);
        color: var(--wg-graph-badge-ready-text, #0052cc);
        background: var(--wg-graph-badge-ready-bg, #deebff);
      }

      .status-badge.is-blocked {
        border-color: var(--wg-graph-badge-blocked-border, #ffbdad);
        color: var(--wg-graph-badge-blocked-text, #bf2600);
        background: var(--wg-graph-badge-blocked-bg, #ffebe6);
      }

      .graph-card-wrap {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .edge-port {
        position: absolute;
        width: 8px;
        height: 8px;
        opacity: 0;
        pointer-events: none;
      }

      .edge-port.target {
        left: -4px;
        top: 50%;
        transform: translateY(-50%);
      }

      .edge-port.source {
        right: -4px;
        top: 50%;
        transform: translateY(-50%);
      }

      .edge-port.target-top {
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
      }

      .edge-port.source-bottom {
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
      }
    `
    ];
    render() {
      const data = this.data ?? {};
      const kind = String(data.kind ?? "");
      const tone = KIND_LAYER_TONE[kind] ?? "";
      const rejected = data.rejected === true || kind === "intent_option" && data.selected !== true;
      const done = data.status === "done" || data.status === "verified";
      const classes = [
        "graph-card",
        tone,
        data.selected === true ? "is-selected" : "",
        rejected ? "is-rejected" : "",
        data.focused === true ? "is-focused" : "",
        done ? "is-done" : ""
      ].filter(Boolean).join(" ");
      const progress = Number(data.childCount) > 0 ? ` ${data.doneChildCount ?? 0}/${data.childCount}` : "";
      const statusText = data.status ? `${String(data.status)}${progress}` : "";
      return b2`
      <div class="graph-card-wrap">
        <button type="button" class=${classes} @click=${this.onCardClick}>
          <div class="layer">${String(data.layer ?? kind)}</div>
          <p class="title">${String(data.title ?? this.id)}</p>
          ${data.summary ? b2`<p class="summary">${String(data.summary)}</p>` : null}
          ${statusText ? b2`
            <div class="status-row">
              <span class="status-badge ${statusBadgeClass(data.status)}">${statusText}</span>
            </div>
          ` : null}
        </button>
        <div class="edge-port target" data-handle-id="target"></div>
        <div class="edge-port source" data-handle-id="source"></div>
        <div class="edge-port target-top" data-handle-id="target-top"></div>
        <div class="edge-port source-bottom" data-handle-id="source-bottom"></div>
      </div>
    `;
    }
    onCardClick(event) {
      event.stopPropagation();
      const data = this.data ?? {};
      this.dispatchEvent(new CustomEvent("graph-node-click", {
        bubbles: true,
        composed: true,
        detail: {
          nodeId: this.id,
          kind: data.kind,
          taskId: data.taskId || void 0,
          intentNodeId: data.intentNodeId || void 0,
          blockId: data.blockId || void 0,
          schematicId: data.schematicId || void 0
        }
      }));
    }
  };
  if (!customElements.get("graph-card-node")) {
    customElements.define("graph-card-node", GraphCardNode);
  }

  // src/graphCanvasLitFlow/client/mountGraphCanvasLitFlow.ts
  var mountedHosts = /* @__PURE__ */ new WeakMap();
  var themeObservers = /* @__PURE__ */ new WeakMap();
  var resizeObservers = /* @__PURE__ */ new WeakMap();
  var minimapHosts = /* @__PURE__ */ new WeakMap();
  function resolveGraphCanvasTheme2() {
    return document.body?.dataset?.theme === "dark" ? "dark" : "light";
  }
  function applyGraphCanvasHostTheme(host, theme) {
    host.dataset.graphTheme = theme;
  }
  function applyFlowCanvasTheme(canvas, background, theme) {
    canvas.setAttribute("theme", theme);
    background.setAttribute("variant", "dots");
    background.setAttribute("gap", theme === "dark" ? "20" : "18");
    background.setAttribute("color", theme === "dark" ? "#3c3c3c" : "#dfe1e6");
  }
  function watchGraphCanvasTheme(host, canvas, background, projection, getSelectedNodeId) {
    themeObservers.get(host)?.disconnect();
    const observer = new MutationObserver(() => {
      const theme = resolveGraphCanvasTheme2();
      applyGraphCanvasHostTheme(host, theme);
      applyFlowCanvasTheme(canvas, background, theme);
      minimapHosts.get(host)?.setAttribute("data-theme", theme);
      const { nodes } = graphCanvasProjectionToFlow(projection, { theme });
      const selectedNodeId = getSelectedNodeId();
      canvas.setNodes(nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
      })));
      canvas.setEdges([]);
      repaintGraphCanvasSvgEdges(canvas, projection);
      canvas.requestUpdate();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    themeObservers.set(host, observer);
  }
  function ensureFlowTagsRegistered() {
    if (!customElements.get("flow-canvas")) {
      customElements.define("flow-background", FlowBackground);
      customElements.define("flow-controls", FlowControls);
      customElements.define("flow-canvas", FlowCanvas);
    }
  }
  function parseProjection(host) {
    const raw = host.getAttribute("data-graph-canvas-projection");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function selectNode(canvas, nodeId) {
    const nodes = canvas.nodes.map((node) => ({
      ...node,
      selected: node.id === nodeId
    }));
    canvas.setNodes(nodes);
  }
  function focusNodeByKeyboard(canvas, projection, nodeId) {
    selectNode(canvas, nodeId);
    canvas.instance.updateNode(nodeId, { selected: true });
    canvas.requestUpdate();
  }
  function injectFlowCanvasChromeReset(canvas) {
    const root2 = canvas.shadowRoot;
    if (!root2 || root2.querySelector("[data-wg-flow-chrome-reset]")) {
      return;
    }
    const style = document.createElement("style");
    style.setAttribute("data-wg-flow-chrome-reset", "true");
    style.textContent = `
    .edge-label {
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
  `;
    root2.appendChild(style);
  }
  function mountGraphCanvasLitFlow(host, options = {}) {
    const previous = mountedHosts.get(host);
    if (previous) {
      unmountGraphCanvasSvgEdges(previous);
      previous.instance?.destroy();
    }
    themeObservers.get(host)?.disconnect();
    themeObservers.delete(host);
    resizeObservers.get(host)?.disconnect();
    resizeObservers.delete(host);
    const previousMinimapHost = minimapHosts.get(host);
    if (previousMinimapHost) {
      unmountGraphCanvasMinimap(previousMinimapHost);
      minimapHosts.delete(host);
    }
    mountedHosts.delete(host);
    ensureFlowTagsRegistered();
    const projection = parseProjection(host);
    if (!projection?.nodes?.length) {
      host.innerHTML = '<div class="empty">Graph projection \u043F\u0443\u0441\u0442</div>';
      return;
    }
    const fill = options.fill === true || host.dataset.graphCanvasFill === "true";
    host.innerHTML = "";
    host.classList.add("graph-canvas-lit-flow-host");
    host.style.position = fill ? "absolute" : "relative";
    host.style.width = "100%";
    if (fill) {
      host.style.inset = "0";
      host.style.height = "100%";
      host.style.minHeight = "0";
    } else {
      const height = options.height ?? Number(host.dataset.graphCanvasHeight ?? 480);
      host.style.minHeight = `${height}px`;
      host.style.height = `${height}px`;
    }
    const shell = document.createElement("div");
    shell.className = "graph-canvas-lit-flow-shell";
    shell.style.width = "100%";
    shell.style.height = "100%";
    shell.style.position = "relative";
    const canvas = document.createElement("flow-canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.nodeTypes = { "graph-card": "graph-card-node" };
    const background = document.createElement("flow-background");
    background.setAttribute("slot", "background");
    const theme = resolveGraphCanvasTheme2();
    applyGraphCanvasHostTheme(host, theme);
    applyFlowCanvasTheme(canvas, background, theme);
    const controls = document.createElement("flow-controls");
    const minimapHost = document.createElement("div");
    minimapHost.className = "graph-canvas-minimap-host";
    canvas.appendChild(background);
    canvas.appendChild(controls);
    canvas.appendChild(minimapHost);
    shell.appendChild(canvas);
    host.appendChild(shell);
    minimapHosts.set(host, minimapHost);
    const { nodes } = graphCanvasProjectionToFlow(projection, { theme });
    let selectedNodeId = projection.nodes[0]?.id ?? "";
    const applyGraph = () => {
      canvas.setNodes(nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
      })));
      canvas.setEdges([]);
    };
    customElements.whenDefined("flow-canvas").then(() => {
      injectFlowCanvasChromeReset(canvas);
      injectFlowCanvasNativeEdgeHide(canvas);
      applyGraph();
      mountGraphCanvasSvgEdges(canvas, projection);
      controls.instance = canvas.instance;
      mountGraphCanvasMinimap(minimapHost, () => canvas, {
        width: 168,
        height: 108,
        theme
      });
      watchGraphCanvasTheme(host, canvas, background, projection, () => selectedNodeId);
      window.requestAnimationFrame(() => {
        canvas.instance.fitView();
      });
      if (fill) {
        const resizeTarget = host.parentElement ?? host;
        const observer = new ResizeObserver(() => {
          window.requestAnimationFrame(() => {
            canvas.instance?.fitView({ padding: 0.12, duration: 0 });
          });
        });
        observer.observe(resizeTarget);
        resizeObservers.set(host, observer);
      }
    });
    host.addEventListener("graph-node-click", (event) => {
      const detail = event.detail ?? {};
      if (detail.nodeId) {
        selectedNodeId = detail.nodeId;
        selectNode(canvas, selectedNodeId);
      }
      host.dispatchEvent(new CustomEvent("workgraph-graph-node-click", {
        bubbles: true,
        detail
      }));
    });
    host.tabIndex = 0;
    host.addEventListener("keydown", (event) => {
      if (!selectedNodeId) {
        return;
      }
      let nextId = selectedNodeId;
      if (event.key === "ArrowRight") {
        const outgoing = getOutgoingNodeIds(selectedNodeId, projection.edges);
        nextId = outgoing[0] ?? selectedNodeId;
      } else if (event.key === "ArrowLeft") {
        const incoming = getIncomingNodeIds(selectedNodeId, projection.edges);
        nextId = incoming[0] ?? selectedNodeId;
      } else if (event.key === "ArrowDown") {
        const siblings = getSiblingNodeIds(selectedNodeId, projection.edges, projection.nodes);
        const downstream = getDownstreamNodeIds(selectedNodeId, projection.edges);
        const candidates = sortNodeIdsByVerticalPosition([...siblings, ...downstream], projection.nodes).filter((id2) => id2 !== selectedNodeId);
        nextId = candidates[0] ?? selectedNodeId;
      } else if (event.key === "ArrowUp") {
        const upstream = getUpstreamNodeIds(selectedNodeId, projection.edges);
        nextId = upstream[0] ?? selectedNodeId;
      } else if (event.key === "Enter") {
        host.dispatchEvent(new CustomEvent("workgraph-graph-node-click", {
          bubbles: true,
          detail: {
            nodeId: selectedNodeId,
            ...nodes.find((node) => node.id === selectedNodeId)?.data ?? {}
          }
        }));
        return;
      } else {
        return;
      }
      event.preventDefault();
      if (nextId !== selectedNodeId) {
        selectedNodeId = nextId;
        focusNodeByKeyboard(canvas, projection, selectedNodeId);
      }
    });
    mountedHosts.set(host, canvas);
  }
  function mountAllGraphCanvasLitFlowHosts(root2 = document) {
    for (const host of root2.querySelectorAll("[data-graph-canvas-projection]")) {
      mountGraphCanvasLitFlow(host);
    }
  }
  window.__WORKGRAPH_MOUNT_GRAPH_CANVAS__ = mountAllGraphCanvasLitFlowHosts;
  return __toCommonJS(mountGraphCanvasLitFlow_exports);
})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/static.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/style-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
//# sourceMappingURL=graph-canvas-lit-flow.js.map
