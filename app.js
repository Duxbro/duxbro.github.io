const { useEffect, useState, useMemo, useRef } = React;

// --- 1. Tokenizer & Parser Logic (Unchanged) ---

const tokenize = (input) => {
  const tokens = [];
  const regex = /\s*([()+\-*/^]|(?:\d+\.?\d*)|\w+)\s*/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match.index === regex.lastIndex) regex.lastIndex++;
    if (match[1]) tokens.push(match[1]);
  }
  return tokens;
};

class Node {
  constructor(type, value, left = null, right = null, label = null) {
    this.type = type; 
    this.value = value;
    this.left = left;
    this.right = right;
    this.label = label;
    this.isBuff = false; 
  }
}

const parse = (tokens, definedVars) => {
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const parseExpression = () => parseAddSub();

  const parseAddSub = () => {
    let left = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseMulDiv();
      left = new Node('operator', op, left, right);
    }
    return left;
  };

  const parseMulDiv = () => {
    let left = parsePrimary();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parsePrimary();
      left = new Node('operator', op, left, right);
    }
    return left;
  };

  const parsePrimary = () => {
    const token = consume();
    if (!token) throw new Error("Unexpected end");

    if (!isNaN(parseFloat(token))) {
      return new Node('value', parseFloat(token));
    }

    if (token === '(') {
      const node = parseExpression();
      if (consume() !== ')') throw new Error("Missing )");
      return node; 
    }

    if (definedVars[token]) {
      return new Node('reference', null, null, null, token);
    }

    throw new Error(`Unknown: ${token}`);
  };

  const root = parseExpression();
  if (cursor < tokens.length) throw new Error(`Unexpected token: ${tokens[cursor]}`);
  return root;
};

const evaluateTree = (node, computedContext) => {
  if (!node) return 0;
  if (node.type === 'value') return node.value;
  
  if (node.type === 'reference') {
    return computedContext[node.label] ? computedContext[node.label].value : 0;
  }
  
  if (node.type === 'operator') {
    const l = evaluateTree(node.left, computedContext);
    const r = evaluateTree(node.right, computedContext);
    switch (node.value) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return l / r;
      default: return 0;
    }
  }
  return 0;
};

// --- 2. Visual Components ---

const OperatorDisplay = ({ op, isBuff }) => (
  _react2.default.createElement('span', { className: `mx-1 font-bold font-mono ${isBuff ? 'text-amber-500' : 'text-slate-400'}`,}
    , op
  )
);

const ValueDisplay = ({ val, isBuff }) => (
  _react2.default.createElement('span', { className: `font-mono font-semibold ${isBuff ? 'text-amber-600' : 'text-slate-800'}`,}
    , Number(val).toFixed(2).replace(/\.00$/, '')
  )
);

const ParenDisplay = ({ children }) => (
  _react2.default.createElement('div', { className: "inline-flex items-center mx-0.5"  ,}
    , _react2.default.createElement('span', { className: "text-slate-300 text-lg font-light"  ,}, "(")
    , children
    , _react2.default.createElement('span', { className: "text-slate-300 text-lg font-light"  ,}, ")")
  )
);

const BraceDisplay = ({ label, children, result, isBuffed }) => {
  return (
    _react2.default.createElement('div', { className: "inline-flex flex-col items-center mx-1 group relative align-top"      ,}
      , _react2.default.createElement('div', { className: "px-1 z-10 flex items-center"   ,}
        , children
      )
      , _react2.default.createElement('div', { className: `w-full h-2 border-b-2 border-l-2 border-r-2 rounded-b-md mt-[1px] relative flex justify-center ${isBuffed ? 'border-amber-300' : 'border-indigo-300'}`,}
         , _react2.default.createElement('div', { className: `w-[2px] h-2 -mb-2 ${isBuffed ? 'bg-amber-300' : 'bg-indigo-300'}`,})
      )
      , _react2.default.createElement('div', { className: "mt-1 flex flex-col items-center"   ,}
        , _react2.default.createElement('span', { className: `text-xs font-bold px-1 rounded border whitespace-nowrap flex items-center gap-1 ${isBuffed ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`,}
          , label
          , isBuffed && _react2.default.createElement(_lucidereact.Zap, { size: 8, fill: "currentColor",} )
        )
        , _react2.default.createElement('span', { className: "opacity-0 group-hover:opacity-100 absolute top-full mt-6 text-[10px] bg-slate-800 text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-20 pointer-events-none"              ,}, "Current Value: "
            , _optionalChain([result, 'optionalAccess', _ => _.toLocaleString, 'call', _2 => _2()])
        )
      )
    )
  );
};

const FormulaTreeVisualizer = ({ node, computedContext }) => {
  if (!node) return null;

  if (node.type === 'value') {
    return _react2.default.createElement(ValueDisplay, { val: node.value, isBuff: node.isBuff,} );
  }

  if (node.type === 'operator') {
    return (
      _react2.default.createElement('div', { className: "inline-flex items-center align-baseline"  ,}
        , _react2.default.createElement(FormulaTreeVisualizer, { node: node.left, computedContext: computedContext,} )
        , _react2.default.createElement(OperatorDisplay, { op: node.value, isBuff: node.isBuff,} )
        , _react2.default.createElement(FormulaTreeVisualizer, { node: node.right, computedContext: computedContext,} )
      )
    );
  }

  if (node.type === 'paren') {
    return (
      _react2.default.createElement(ParenDisplay, null
        , _react2.default.createElement(FormulaTreeVisualizer, { node: node.content, computedContext: computedContext,} )
      )
    );
  }

  if (node.type === 'reference') {
    const ctx = computedContext[node.label];
    const val = _optionalChain([ctx, 'optionalAccess', _3 => _3.value]) || 0;
    const targetNode = _optionalChain([ctx, 'optionalAccess', _4 => _4.displayTree]); 
    
    return (
      _react2.default.createElement(BraceDisplay, { label: node.label, result: val, isBuffed: _optionalChain([ctx, 'optionalAccess', _5 => _5.isBuffed]),}
        , _react2.default.createElement(FormulaTreeVisualizer, { node: targetNode, computedContext: computedContext,} )
      )
    );
  }

  return null;
};


// --- 3. Core Calculation Engine ---

const calculateSystem = (rows, buffs, activeBuffIds) => {
  const computed = {};
  const errors = {};
  
  const activeModsByTarget = {};
  buffs.forEach(buff => {
    if (activeBuffIds.has(buff.id)) {
      buff.mods.forEach(mod => {
        if (!activeModsByTarget[mod.targetVar]) {
          activeModsByTarget[mod.targetVar] = { mult: 0, flat: 0 };
        }
        if (mod.type === 'mult') {
          activeModsByTarget[mod.targetVar].mult += parseFloat(mod.value) || 0;
        } else {
          activeModsByTarget[mod.targetVar].flat += parseFloat(mod.value) || 0;
        }
      });
    }
  });

  rows.forEach(row => {
    try {
      if (!row.name) throw new Error("Name required");
      if (!row.expression) throw new Error("Expr required");

      const tokens = tokenize(row.expression);
      const originalTree = parse(tokens, computed);
      
      let value = evaluateTree(originalTree, computed);

      const mods = activeModsByTarget[row.name];
      let displayTree = originalTree;

      if (mods) {
        value = value * (1 + mods.mult) + mods.flat;

        if (mods.mult !== 0) {
          let leftNode = displayTree;
          if (leftNode.type === 'operator') {
            leftNode = new Node('paren', null, null, null, null);
            leftNode.content = displayTree;
          }
          const multNode = new Node('value', 1 + mods.mult);
          multNode.isBuff = true;
          const opNode = new Node('operator', '*', leftNode, multNode);
          opNode.isBuff = true;
          displayTree = opNode;
        }

        if (mods.flat !== 0) {
          const op = mods.flat > 0 ? '+' : '-';
          const absFlat = Math.abs(mods.flat);
          const flatNode = new Node('value', absFlat);
          flatNode.isBuff = true;
          const opNode = new Node('operator', op, displayTree, flatNode);
          opNode.isBuff = true;
          displayTree = opNode;
        }
      }
      
      computed[row.name] = {
        tree: originalTree,
        displayTree: displayTree,
        value: value,
        isBuffed: !!mods 
      };
    } catch (e) {
      errors[row.id] = e.message;
    }
  });

  return { computed, errors };
};


// --- 4. Main Application ---

 function UnifiedFormulaBuilder() {
  // --- State ---

  const [rows, setRows] = _react.useState.call(void 0, [
    { id: 'r1', name: 'Base', expression: '100' },
    { id: 'r2', name: 'Bonus', expression: '50' },
    { id: 'r3', name: 'Total', expression: '(Base + Bonus) * 2' },
  ]);

  const [activeTargetId, setActiveTargetId] = _react.useState.call(void 0, 'r3');

  const [buffs, setBuffs] = _react.useState.call(void 0, [
    {
      id: 'b1',
      name: 'Heroism',
      mods: [
        { id: 'm1', targetVar: 'Base', type: 'mult', value: 0.1 }
      ]
    }
  ]);

  // Buff scenarios for comparison table
  const [buffScenarios, setBuffScenarios] = _react.useState.call(void 0, [
    { id: 's1', name: 'Baseline', activeBuffIds: new Set() },
    { id: 's2', name: 'All Buffs', activeBuffIds: new Set(['b1']) },
  ]);

  const [activeScenarioId, setActiveScenarioId] = _react.useState.call(void 0, 's2');

  // Baseline scenario for comparison (defaults to first scenario)
  const [baselineScenarioId, setBaselineScenarioId] = _react.useState.call(void 0, 's1');

  // Drag state for buff reordering
  const [draggedBuffId, setDraggedBuffId] = _react.useState.call(void 0, null);
  const [dragOverBuffId, setDragOverBuffId] = _react.useState.call(void 0, null);

  // Derive activeBuffIds from the selected scenario
  const activeScenario = buffScenarios.find(s => s.id === activeScenarioId) || buffScenarios[0];
  const activeBuffIds = activeScenario ? activeScenario.activeBuffIds : new Set();
  
  const [mainResult, setMainResult] = _react.useState.call(void 0, { computed: {}, errors: {} });
  const [previews, setPreviews] = _react.useState.call(void 0, {});
  const [isLoading, setIsLoading] = _react.useState.call(void 0, false);
  const [importError, setImportError] = _react.useState.call(void 0, null);
  const fileInputRef = _react.useRef.call(void 0, null);

  // --- Logic ---

  _react.useEffect.call(void 0, () => {
    const result = calculateSystem(rows, buffs, activeBuffIds);
    setMainResult(result);

    const activeRow = rows.find(r => r.id === activeTargetId);
    if (!activeRow) return; 

    const targetName = activeRow.name;
    const currentTargetValue = _optionalChain([result, 'access', _6 => _6.computed, 'access', _7 => _7[targetName], 'optionalAccess', _8 => _8.value]) || 0;
    
    const newPreviews = {};
    
    buffs.forEach(buff => {
      if (!activeBuffIds.has(buff.id)) {
        const hypotheticalIds = new Set(activeBuffIds);
        hypotheticalIds.add(buff.id);
        
        const hypoResult = calculateSystem(rows, buffs, hypotheticalIds);
        const hypoValue = _optionalChain([hypoResult, 'access', _9 => _9.computed, 'access', _10 => _10[targetName], 'optionalAccess', _11 => _11.value]) || 0;
        const delta = hypoValue - currentTargetValue;
        
        let percent = 0;
        if (currentTargetValue !== 0) {
          percent = (delta / Math.abs(currentTargetValue)) * 100;
        } else if (delta !== 0) {
            percent = delta > 0 ? 100 : -100;
        }

        newPreviews[buff.id] = {
          value: hypoValue,
          delta: delta,
          percent: percent
        };
      }
    });
    
    setPreviews(newPreviews);

  }, [rows, buffs, activeBuffIds, activeTargetId]);

  // --- Handlers ---

  const addRowAt = (index) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newRows = [...rows];
    newRows.splice(index, 0, { id, name: '', expression: '' });
    setRows(newRows);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    const idToRemove = rows[index].id;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);

    if (activeTargetId === idToRemove) {
        setActiveTargetId(newRows[newRows.length - 1].id);
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  // Toggle buff within a specific scenario
  const toggleBuffInScenario = (scenarioId, buffId) => {
    setBuffScenarios(prev => prev.map(scenario => {
      if (scenario.id !== scenarioId) return scenario;
      const newSet = new Set(scenario.activeBuffIds);
      if (newSet.has(buffId)) newSet.delete(buffId);
      else newSet.add(buffId);
      return { ...scenario, activeBuffIds: newSet };
    }));
  };

  const addScenario = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setBuffScenarios([...buffScenarios, { id, name: 'New Scenario', activeBuffIds: new Set() }]);
  };

  const removeScenario = (scenarioId) => {
    if (buffScenarios.length <= 1) return;
    const newScenarios = buffScenarios.filter(s => s.id !== scenarioId);
    setBuffScenarios(newScenarios);
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(newScenarios[0].id);
    }
    // Also update baseline if removed scenario was the baseline
    if (baselineScenarioId === scenarioId) {
      setBaselineScenarioId(newScenarios[0].id);
    }
  };

  const updateScenarioName = (scenarioId, name) => {
    setBuffScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, name } : s));
  };

  const duplicateScenario = (scenarioId) => {
    const source = buffScenarios.find(s => s.id === scenarioId);
    if (!source) return;
    const id = Math.random().toString(36).substr(2, 9);
    setBuffScenarios([...buffScenarios, {
      id,
      name: `${source.name} (Copy)`,
      activeBuffIds: new Set(source.activeBuffIds)
    }]);
  };

  // Calculate results for all scenarios for comparison
  const scenarioResults = _react.useMemo.call(void 0, () => {
    const activeRow = rows.find(r => r.id === activeTargetId);
    if (!activeRow) return {};

    const results = {};
    buffScenarios.forEach(scenario => {
      const result = calculateSystem(rows, buffs, scenario.activeBuffIds);
      results[scenario.id] = {
        value: _optionalChain([result, 'access', _6 => _6.computed, 'access', _7 => _7[activeRow.name], 'optionalAccess', _8 => _8.value]) || 0,
        computed: result.computed
      };
    });
    return results;
  }, [rows, buffs, buffScenarios, activeTargetId]);

  const addBuff = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setBuffs([...buffs, { id, name: 'New Buff', mods: [] }]);
  };

  const removeBuff = (index) => {
    const buffId = buffs[index].id;
    const newBuffs = [...buffs];
    newBuffs.splice(index, 1);
    setBuffs(newBuffs);
    // Also remove this buff from all scenarios
    setBuffScenarios(prev => prev.map(s => {
      const newSet = new Set(s.activeBuffIds);
      newSet.delete(buffId);
      return { ...s, activeBuffIds: newSet };
    }));
  };

  const updateBuffName = (index, val) => {
    const newBuffs = [...buffs];
    newBuffs[index].name = val;
    setBuffs(newBuffs);
  };

  const addModToBuff = (buffIndex) => {
    const newBuffs = [...buffs];
    const target = rows.length > 0 ? rows[0].name : '';
    newBuffs[buffIndex].mods.push({
      id: Math.random().toString(36).substr(2, 9),
      targetVar: target,
      type: 'mult',
      value: 0.1
    });
    setBuffs(newBuffs);
  };

  const updateMod = (buffIndex, modIndex, field, val) => {
    const newBuffs = [...buffs];
    newBuffs[buffIndex].mods[modIndex][field] = val;
    setBuffs(newBuffs);
  };

  const removeMod = (buffIndex, modIndex) => {
    const newBuffs = [...buffs];
    newBuffs[buffIndex].mods.splice(modIndex, 1);
    setBuffs(newBuffs);
  };

  // --- Buff Reordering Handlers ---
  const handleBuffDragStart = (e, buffId) => {
    setDraggedBuffId(buffId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBuffDragOver = (e, buffId) => {
    e.preventDefault();
    if (buffId !== draggedBuffId) {
      setDragOverBuffId(buffId);
    }
  };

  const handleBuffDragLeave = () => {
    setDragOverBuffId(null);
  };

  const handleBuffDrop = (e, targetBuffId) => {
    e.preventDefault();
    if (!draggedBuffId || draggedBuffId === targetBuffId) {
      setDraggedBuffId(null);
      setDragOverBuffId(null);
      return;
    }

    const draggedIndex = buffs.findIndex(b => b.id === draggedBuffId);
    const targetIndex = buffs.findIndex(b => b.id === targetBuffId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBuffs = [...buffs];
    const [draggedBuff] = newBuffs.splice(draggedIndex, 1);
    newBuffs.splice(targetIndex, 0, draggedBuff);
    setBuffs(newBuffs);

    setDraggedBuffId(null);
    setDragOverBuffId(null);
  };

  const handleBuffDragEnd = () => {
    setDraggedBuffId(null);
    setDragOverBuffId(null);
  };

  // --- Import / Export Handlers ---

  const handleExport = () => {
    const data = {
      version: 1,
      rows,
      buffs,
      activeBuffIds: Array.from(activeBuffIds),
      activeTargetId
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logic-chain.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    _optionalChain([fileInputRef, 'access', _12 => _12.current, 'optionalAccess', _13 => _13.click, 'call', _14 => _14()]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Set Loading State
    setIsLoading(true);

    // 2. Use setTimeout to allow UI to paint the loading spinner before heavy parsing
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.rows || !Array.isArray(data.rows)) throw new Error("Invalid rows data");
                if (!data.buffs || !Array.isArray(data.buffs)) throw new Error("Invalid buffs data");

                setRows(data.rows);
                setBuffs(data.buffs);
                setActiveBuffIds(new Set(data.activeBuffIds || []));
                
                if (data.activeTargetId && data.rows.find(r => r.id === data.activeTargetId)) {
                setActiveTargetId(data.activeTargetId);
                } else if (data.rows.length > 0) {
                setActiveTargetId(data.rows[data.rows.length - 1].id);
                }

            } catch (err) {
                setImportError("Failed to import JSON: " + err.message);
            } finally {
                // 3. Turn off loading state after processing
                // Adding a tiny extra delay just so the spinner doesn't flash instantly on fast machines
                setTimeout(() => {
                    setIsLoading(false);
                    e.target.value = null;
                }, 500);
            }
        };
        reader.readAsText(file);
    }, 100);
  };


  const activeRowObj = rows.find(r => r.id === activeTargetId) || rows[rows.length - 1];
  const finalTree = _optionalChain([mainResult, 'access', _15 => _15.computed, 'access', _16 => _16[_optionalChain([activeRowObj, 'optionalAccess', _17 => _17.name])], 'optionalAccess', _18 => _18.displayTree]) || null;
  const finalValue = _optionalChain([mainResult, 'access', _19 => _19.computed, 'access', _20 => _20[_optionalChain([activeRowObj, 'optionalAccess', _21 => _21.name])], 'optionalAccess', _22 => _22.value]) || 0;
  const allValidTargets = rows.map(i => i.name).filter(Boolean);

  return (
    _react2.default.createElement('div', { className: "max-w-7xl mx-auto p-6 bg-slate-50 min-h-screen font-sans text-slate-800 relative"       ,}

      /* Loading Overlay */
      , isLoading && (
        _react2.default.createElement('div', { className: "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center transition-opacity"        ,}
            , _react2.default.createElement('div', { className: "bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200"           ,}
                , _react2.default.createElement(_lucidereact.Loader2, { className: "w-12 h-12 text-indigo-600 animate-spin"   ,} )
                , _react2.default.createElement('div', { className: "text-center",}
                    , _react2.default.createElement('h3', { className: "text-lg font-bold text-slate-800"  ,}, "Importing Data" )
                    , _react2.default.createElement('p', { className: "text-slate-500 text-sm" ,}, "Parsing configuration and recalculating..."   )
                )
            )
        )
      )

      , _react2.default.createElement('div', { className: "mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"      ,}
        , _react2.default.createElement('div', null
          , _react2.default.createElement('h1', { className: "text-2xl font-bold text-slate-900 flex items-center gap-2"     ,}
            , _react2.default.createElement(_lucidereact.Calculator, { className: "text-indigo-600",} ), "Logic Chain Builder"

          )
          , _react2.default.createElement('p', { className: "text-slate-500 mt-2" ,}, "Build a sequential chain of variables. Select any row to visualize its breakdown."

          )
        )

        , _react2.default.createElement('div', { className: "flex items-center gap-2"  ,}
          , _react2.default.createElement('button', { 
            onClick: handleExport,
            disabled: isLoading,
            className: "flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"                 ,}

            , _react2.default.createElement(_lucidereact.Download, { size: 16,} ), " Export JSON"
          )
          , _react2.default.createElement('button', { 
            onClick: handleImportClick,
            disabled: isLoading,
            className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"                ,}

            , isLoading ? _react2.default.createElement(_lucidereact.Loader2, { size: 16, className: "animate-spin",} ) : _react2.default.createElement(_lucidereact.Upload, { size: 16,} ), "Import JSON"

          )
          , _react2.default.createElement('input', { 
            type: "file", 
            ref: fileInputRef, 
            onChange: handleFileChange, 
            accept: ".json", 
            className: "hidden",} 
          )
        )
      )

      , _react2.default.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-12 gap-8"   ,}

        /* Left Column: The Logic Chain */
        , _react2.default.createElement('div', { className: "lg:col-span-5 space-y-6" ,}

          , _react2.default.createElement('div', { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"     ,}
            , _react2.default.createElement('div', { className: "p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center"      ,}
                , _react2.default.createElement('h2', { className: "font-bold text-slate-700 flex items-center gap-2"    ,}
                    , _react2.default.createElement(_lucidereact.ArrowDown, { size: 18,} ), " Calculation Chain"
                )
                , _react2.default.createElement('span', { className: "text-xs text-slate-400 font-medium uppercase tracking-wider"    ,}, "Top to Bottom"  )
            )

            , _react2.default.createElement('div', { className: "p-4 space-y-0" ,}
                , rows.map((row, index) => {
                    const isError = mainResult.errors[row.id];
                    const comp = mainResult.computed[row.name];
                    const result = _optionalChain([comp, 'optionalAccess', _23 => _23.value]);
                    const isBuffed = _optionalChain([comp, 'optionalAccess', _24 => _24.isBuffed]);
                    const isActive = activeTargetId === row.id;

                    return (
                        _react2.default.createElement('div', { key: row.id, className: "relative group/row" ,}

                            /* Insert Zone Above (Only for first item) */
                            , index === 0 && (
                                _react2.default.createElement('div', { className: "h-4 -mt-2 mb-2 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer group/insert"          , onClick: () => addRowAt(0),}
                                    , _react2.default.createElement('div', { className: "h-[1px] bg-indigo-200 w-full relative"   ,}
                                        , _react2.default.createElement('div', { className: "absolute left-1/2 -top-2.5 -translate-x-1/2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full p-1 shadow-sm transform scale-90 group-hover/insert:scale-100 transition-transform"              ,}
                                            , _react2.default.createElement(_lucidereact.Plus, { size: 12,} )
                                        )
                                    )
                                )
                            )

                            /* The Row Card */
                            , _react2.default.createElement('div', { 
                                className: `
                                    flex flex-col gap-2 p-3 rounded-lg border transition-all relative z-10
                                    ${isActive ? 'bg-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-slate-200 hover:border-indigo-200'}
                                `,}

                                , _react2.default.createElement('div', { className: "flex items-center gap-2"  ,}
                                    /* Selection Radio */
                                    , _react2.default.createElement('button', { 
                                        onClick: () => setActiveTargetId(row.id),
                                        className: `shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`,
                                        title: "Visualize this step"  ,}

                                        , _react2.default.createElement(_lucidereact.Eye, { size: 16,} )
                                    )

                                    /* Variable Name */
                                    , _react2.default.createElement('div', { className: "flex items-center bg-slate-100 rounded px-2 py-1 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400"          ,}
                                        , _react2.default.createElement('input', { 
                                            type: "text", 
                                            placeholder: "Name", 
                                            className: "bg-transparent outline-none text-sm font-bold text-slate-700 w-24 placeholder:font-normal"      ,
                                            value: row.name,
                                            onChange: (e) => updateRow(index, 'name', e.target.value),}
                                        )
                                    )

                                    , _react2.default.createElement('div', { className: "text-slate-300",}, "=")

                                    /* Expression */
                                    , _react2.default.createElement('div', { className: "flex-1 relative" ,}
                                        , _react2.default.createElement('input', { 
                                            type: "text", 
                                            placeholder: "Expression (e.g. Base * 2)"    , 
                                            className: "w-full bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none text-sm py-1 font-mono text-slate-600"         ,
                                            value: row.expression,
                                            onChange: (e) => updateRow(index, 'expression', e.target.value),}
                                        )
                                    )

                                    /* Delete */
                                    , _react2.default.createElement('button', { 
                                        onClick: () => removeRow(index), 
                                        className: "text-slate-300 hover:text-red-500 transition-colors p-1"   ,
                                        disabled: rows.length <= 1,}

                                        , _react2.default.createElement(_lucidereact.Trash2, { size: 14,} )
                                    )
                                )

                                /* Row Footer: Result & Status */
                                , _react2.default.createElement('div', { className: "flex justify-between items-center text-xs pl-10"    ,}
                                    , isError ? (
                                        _react2.default.createElement('span', { className: "text-red-500 flex items-center gap-1"   ,}, _react2.default.createElement(_lucidereact.AlertCircle, { size: 12,} ), " " , isError)
                                    ) : (
                                        _react2.default.createElement('div', { className: "flex items-center gap-2"  ,}
                                            , _react2.default.createElement('span', { className: "text-slate-400 font-medium" ,}, "Result:")
                                            , _react2.default.createElement('span', { className: `font-mono px-2 py-0.5 rounded transition-colors ${isBuffed ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-emerald-50 text-emerald-600 font-semibold'}`,}
                                                , result !== undefined ? result.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'
                                            )
                                            , isBuffed && _react2.default.createElement('span', { className: "text-[10px] text-amber-600 uppercase font-bold tracking-wide flex items-center gap-1"       ,}, _react2.default.createElement(_lucidereact.Zap, { size: 10, fill: "currentColor",} ), " Buffed" )
                                        )
                                    )
                                )
                            )

                            /* Insert Zone Below */
                            , _react2.default.createElement('div', { className: "h-6 -my-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer group/insert relative z-20"           , onClick: () => addRowAt(index + 1),}
                                , _react2.default.createElement('div', { className: "h-[1px] bg-indigo-200 w-full relative"   ,}
                                    , _react2.default.createElement('div', { className: "absolute left-1/2 -top-2.5 -translate-x-1/2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full p-1 shadow-sm transform scale-90 group-hover/insert:scale-100 transition-transform"              ,}
                                        , _react2.default.createElement(_lucidereact.Plus, { size: 12,} )
                                    )
                                )
                            )

                        )
                    );
                })
            )
          )

          /* Buff Comparison Table */
          , _react2.default.createElement('div', { className: "space-y-4 pt-4 border-t border-slate-200",}
            , _react2.default.createElement('div', { className: "flex flex-col gap-3 mb-2",}
              , _react2.default.createElement('div', { className: "flex justify-between items-center",}
                , _react2.default.createElement('h2', { className: "font-bold text-slate-700 flex items-center gap-2",}
                  , _react2.default.createElement(_lucidereact.Zap, { size: 18, className: "text-amber-500", fill: "currentColor",}), " Buff Scenarios"
                )
                , _react2.default.createElement('button', { onClick: addScenario, className: "text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1",}
                  , _react2.default.createElement(_lucidereact.Plus, { size: 12,}), " Add Scenario"
                )
              )
              /* Baseline Selector */
              , buffScenarios.length > 1 && _react2.default.createElement('div', { className: "flex items-center gap-2 text-sm",}
                , _react2.default.createElement('span', { className: "text-slate-500 flex items-center gap-1",}
                  , _react2.default.createElement(_lucidereact.Target, { size: 12,}), "Compare to:"
                )
                , _react2.default.createElement('select', {
                  value: baselineScenarioId,
                  onChange: (e) => setBaselineScenarioId(e.target.value),
                  className: "bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400",
                }
                  , buffScenarios.map(s => _react2.default.createElement('option', { key: s.id, value: s.id,}, s.name))
                )
              )
            )

            /* Comparison Table */
            , buffs.length > 0 && buffScenarios.length > 0 && (
              _react2.default.createElement('div', { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",}
                , _react2.default.createElement('div', { className: "overflow-x-auto",}
                  , _react2.default.createElement('table', { className: "w-full text-sm",}
                    , _react2.default.createElement('thead', null
                      , _react2.default.createElement('tr', { className: "bg-slate-50 border-b border-slate-200",}
                        , _react2.default.createElement('th', { className: "text-left p-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[800px]",}, "Scenario")
                        , buffs.map(buff => (
                          _react2.default.createElement('th', { key: buff.id, className: "text-center p-3 font-semibold text-slate-600 min-w-[80px]",}
                            , _react2.default.createElement('div', { className: "flex items-center justify-center gap-1",}
                              , _react2.default.createElement(_lucidereact.Zap, { size: 12, className: "text-amber-500", fill: "currentColor",})
                              , _react2.default.createElement('span', { className: "truncate max-w-[60px]", title: buff.name,}, buff.name)
                            )
                          )
                        ))
                        , _react2.default.createElement('th', { className: "text-center p-3 font-semibold text-emerald-600 min-w-[100px] bg-emerald-50 sticky right-[80px] z-10",}, "Result")
                        , _react2.default.createElement('th', { className: "text-center p-3 font-semibold text-slate-400 w-[80px] sticky right-0 z-10 bg-slate-50",}, "Actions")
                      )
                    )
                    , _react2.default.createElement('tbody', null
                      , buffScenarios.map((scenario, sIndex) => {
                        const isSelected = activeScenarioId === scenario.id;
                        const isBaseline = baselineScenarioId === scenario.id;
                        const result = scenarioResults[scenario.id];
                        const baselineResult = scenarioResults[baselineScenarioId];
                        const delta = result && baselineResult ? result.value - baselineResult.value : 0;
                        const deltaPercent = baselineResult && baselineResult.value !== 0 ? (delta / Math.abs(baselineResult.value)) * 100 : 0;

                        return _react2.default.createElement('tr', {
                          key: scenario.id,
                          className: `border-b border-slate-100 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`,
                          onClick: () => setActiveScenarioId(scenario.id),
                        }
                          , _react2.default.createElement('td', { className: `p-3 sticky left-0 z-10 ${isSelected ? 'bg-indigo-50' : 'bg-white'}`,}
                            , _react2.default.createElement('div', { className: "flex items-center gap-2",}
                              , _react2.default.createElement('div', { className: `w-3 h-3 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`,})
                              , _react2.default.createElement('input', {
                                type: "text",
                                className: "bg-transparent font-medium text-slate-700 outline-none w-full min-w-0 text-sm",
                                value: scenario.name,
                                onChange: (e) => updateScenarioName(scenario.id, e.target.value),
                                onClick: (e) => e.stopPropagation(),
                              })
                            )
                          )
                          , buffs.map(buff => {
                            const isActive = scenario.activeBuffIds.has(buff.id);
                            return _react2.default.createElement('td', { key: buff.id, className: "text-center p-3",}
                              , _react2.default.createElement('button', {
                                className: `w-6 h-6 rounded flex items-center justify-center transition-all ${isActive ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`,
                                onClick: (e) => { e.stopPropagation(); toggleBuffInScenario(scenario.id, buff.id); },
                              }
                                , isActive ? _react2.default.createElement(_lucidereact.Check, { size: 14,}) : _react2.default.createElement(_lucidereact.Minus, { size: 14,})
                              )
                            );
                          })
                          , _react2.default.createElement('td', { className: `text-center p-3 sticky right-[80px] z-10 ${isSelected ? 'bg-emerald-50' : 'bg-emerald-50/50'}`,}
                            , _react2.default.createElement('div', { className: "flex flex-col items-center",}
                              , _react2.default.createElement('span', { className: "font-bold text-slate-800",}
                                , result ? result.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'
                              )
                              , !isBaseline && delta !== 0 && (
                                _react2.default.createElement('span', { className: `text-[10px] font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`,}
                                  , delta > 0 ? '+' : '', delta.toLocaleString(undefined, { maximumFractionDigits: 1 })
                                  , " (", deltaPercent > 0 ? '+' : '', deltaPercent.toFixed(1), "%)"
                                )
                              )
                              , isBaseline && (
                                _react2.default.createElement('span', { className: "text-[10px] font-medium text-slate-400",}, "baseline")
                              )
                            )
                          )
                          , _react2.default.createElement('td', { className: `text-center p-3 sticky right-0 z-10 ${isSelected ? 'bg-indigo-50' : 'bg-white'}`,}
                            , _react2.default.createElement('div', { className: "flex items-center justify-center gap-1",}
                              , _react2.default.createElement('button', {
                                onClick: (e) => { e.stopPropagation(); setBaselineScenarioId(scenario.id); },
                                className: `p-1 transition-colors ${isBaseline ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`,
                                title: isBaseline ? "Current baseline" : "Set as baseline",
                              }, _react2.default.createElement(_lucidereact.Target, { size: 12,}))
                              , _react2.default.createElement('button', {
                                onClick: (e) => { e.stopPropagation(); duplicateScenario(scenario.id); },
                                className: "p-1 text-slate-400 hover:text-indigo-600 transition-colors",
                                title: "Duplicate scenario",
                              }, _react2.default.createElement(_lucidereact.Copy, { size: 12,}))
                              , buffScenarios.length > 1 && _react2.default.createElement('button', {
                                onClick: (e) => { e.stopPropagation(); removeScenario(scenario.id); },
                                className: "p-1 text-slate-400 hover:text-red-500 transition-colors",
                                title: "Delete scenario",
                              }, _react2.default.createElement(_lucidereact.Trash2, { size: 12,}))
                            )
                          )
                        );
                      })
                    )
                  )
                )
              )
            )

            , buffs.length === 0 && (
              _react2.default.createElement('div', { className: "text-center py-8 text-slate-400",}
                , _react2.default.createElement('p', null, "Add buffs below to start comparing scenarios")
              )
            )

            /* Buff Definitions */
            , _react2.default.createElement('div', { className: "mt-6",}
              , _react2.default.createElement('h3', { className: "text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2",}
                , _react2.default.createElement(_lucidereact.Settings, { size: 14,}), " Buff Definitions"
                , _react2.default.createElement('span', { className: "text-xs text-slate-400 font-normal ml-auto flex items-center gap-1",}, _react2.default.createElement(_lucidereact.GripVertical, { size: 10,}), " Drag handle to reorder")
              )
              , _react2.default.createElement('div', { className: "space-y-2",}
                , buffs.map((buff, bIndex) => (
                  _react2.default.createElement('div', {
                    key: buff.id,
                    className: `bg-white rounded-lg border overflow-hidden transition-all ${dragOverBuffId === buff.id ? 'border-indigo-400 shadow-md ring-2 ring-indigo-200' : draggedBuffId === buff.id ? 'opacity-50 border-slate-300' : 'border-slate-200'}`,
                    onDragOver: (e) => handleBuffDragOver(e, buff.id),
                    onDragLeave: handleBuffDragLeave,
                    onDrop: (e) => handleBuffDrop(e, buff.id),
                  }
                    , _react2.default.createElement('div', { className: "p-3 flex items-center gap-3 bg-slate-50 border-b border-slate-100",}
                      , _react2.default.createElement('div', {
                        className: "cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600",
                        draggable: true,
                        onDragStart: (e) => handleBuffDragStart(e, buff.id),
                        onDragEnd: handleBuffDragEnd,
                      }
                        , _react2.default.createElement(_lucidereact.GripVertical, { size: 14,})
                      )
                      , _react2.default.createElement(_lucidereact.Zap, { size: 14, className: "text-amber-500", fill: "currentColor",})
                      , _react2.default.createElement('input', {
                        type: "text",
                        className: "bg-transparent font-bold text-slate-700 outline-none flex-1 text-sm",
                        value: buff.name,
                        onChange: (e) => updateBuffName(bIndex, e.target.value),
                        placeholder: "Buff Name",
                      })
                      , _react2.default.createElement('button', { onClick: () => removeBuff(bIndex), className: "text-slate-400 hover:text-red-500",}
                        , _react2.default.createElement(_lucidereact.X, { size: 14,})
                      )
                    )
                    , _react2.default.createElement('div', { className: "p-3 space-y-2",}
                      , buff.mods.map((mod, mIndex) => (
                        _react2.default.createElement('div', { key: mod.id, className: "flex items-center gap-2 text-sm",}
                          , _react2.default.createElement('select', {
                            className: "bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-indigo-700 outline-none focus:border-indigo-400 w-24",
                            value: mod.targetVar,
                            onChange: (e) => updateMod(bIndex, mIndex, 'targetVar', e.target.value),
                          }
                            , _react2.default.createElement('option', { value: "", disabled: true,}, "Target...")
                            , allValidTargets.map(name => _react2.default.createElement('option', { key: name, value: name,}, name))
                          )
                          , _react2.default.createElement('div', { className: "flex bg-slate-100 rounded border border-slate-200 p-0.5",}
                            , _react2.default.createElement('button', {
                              className: `p-1 rounded ${mod.type === 'mult' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`,
                              onClick: () => updateMod(bIndex, mIndex, 'type', 'mult'),
                              title: "Multiplier",
                            }, _react2.default.createElement(_lucidereact.Percent, { size: 12,}))
                            , _react2.default.createElement('button', {
                              className: `p-1 rounded ${mod.type === 'flat' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`,
                              onClick: () => updateMod(bIndex, mIndex, 'type', 'flat'),
                              title: "Flat Value",
                            }, _react2.default.createElement(_lucidereact.Hash, { size: 12,}))
                          )
                          , _react2.default.createElement('input', {
                            type: "number",
                            step: mod.type === 'mult' ? "0.1" : "1",
                            className: "w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-amber-400",
                            value: mod.value,
                            onChange: (e) => updateMod(bIndex, mIndex, 'value', e.target.value),
                          })
                          , _react2.default.createElement('button', {
                            onClick: () => removeMod(bIndex, mIndex),
                            className: "text-slate-300 hover:text-red-400 ml-auto",
                          }, _react2.default.createElement(_lucidereact.Trash2, { size: 12,}))
                        )
                      ))
                      , _react2.default.createElement('button', {
                        onClick: () => addModToBuff(bIndex),
                        className: "text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 mt-2",
                      }, _react2.default.createElement(_lucidereact.Plus, { size: 12,}), " Add Modification")
                    )
                  )
                ))
                , _react2.default.createElement('button', {
                  onClick: addBuff,
                  className: "w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all flex justify-center items-center gap-2 font-medium text-sm",
                }
                  , _react2.default.createElement(_lucidereact.Plus, { size: 14,}), " Create New Buff"
                )
              )
            )
          )
        )

        /* Right Column: Visualization */
        , _react2.default.createElement('div', { className: "lg:col-span-7",}
          , _react2.default.createElement('div', { className: "sticky top-6" ,}
            , _react2.default.createElement('div', { className: "flex justify-between items-center mb-4"   ,}
               , _react2.default.createElement('h2', { className: "font-bold text-slate-700 flex items-center gap-2"    ,}
                , _react2.default.createElement(_lucidereact.Eye, { size: 18,} ), " Visualization"
              )
              , _react2.default.createElement('div', { className: "text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-2"           ,}, "Viewing: "
                 , _react2.default.createElement('span', { className: "font-bold",}, _optionalChain([activeRowObj, 'optionalAccess', _26 => _26.name]) || 'Unknown')
              )
            )


            , _react2.default.createElement('div', { className: "bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px] flex flex-col"        ,}
              , _react2.default.createElement('div', { className: "flex-1 p-8 overflow-auto flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"       ,}
                , finalTree ? (
                  _react2.default.createElement('div', { className: "text-lg",}
                    , _react2.default.createElement(FormulaTreeVisualizer, { node: finalTree, computedContext: mainResult.computed,} )
                  )
                ) : (
                  _react2.default.createElement('div', { className: "text-slate-400 text-center" ,}, _react2.default.createElement('p', null, "Select a valid variable to visualize."     ))
                )
              )
              , _react2.default.createElement('div', { className: "bg-slate-900 text-white p-6 border-t border-slate-800"    ,}
                , _react2.default.createElement('div', { className: "flex justify-between items-end"  ,}
                  , _react2.default.createElement('div', null
                    , _react2.default.createElement('div', { className: "text-slate-400 text-sm font-medium mb-1"   ,}, "Final Result (Buffed)"  )
                    , _react2.default.createElement('div', { className: "text-4xl font-bold tracking-tight text-emerald-400 flex items-center gap-3"      ,}
                      , finalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      , _optionalChain([mainResult, 'access', _27 => _27.computed, 'access', _28 => _28[_optionalChain([activeRowObj, 'optionalAccess', _29 => _29.name])], 'optionalAccess', _30 => _30.isBuffed]) && _react2.default.createElement('span', { className: "text-sm bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30 font-mono"        ,}, "BUFFS APPLIED" )
                    )
                  )
                  , _react2.default.createElement('div', { className: "text-right",}
                    , _react2.default.createElement('div', { className: "text-slate-500 text-xs uppercase tracking-wider font-bold mb-1"     ,}, "Target")
                    , _react2.default.createElement('div', { className: "text-xl font-mono text-white"  ,}, _optionalChain([activeRowObj, 'optionalAccess', _31 => _31.name]))
                  )
                )
              )
            )

            , _react2.default.createElement('div', { className: "mt-4 bg-blue-50 text-blue-700 text-sm p-4 rounded-lg border border-blue-100 flex gap-3"         ,}
              , _react2.default.createElement(_lucidereact.ArrowDown, { className: "shrink-0 mt-0.5" , size: 16,} )
              , _react2.default.createElement('div', null
                , _react2.default.createElement('p', { className: "font-bold",}, "How to use:"  )
                , _react2.default.createElement('p', { className: "opacity-80",}, "1. Define variables in order. You can reference any variable defined above."

                  , _react2.default.createElement('br', null), "2. Hover between rows to "
                       , _react2.default.createElement('span', { className: "font-bold",}, _react2.default.createElement(_lucidereact.Plus, { size: 10, className: "inline",}), " Insert" ), " new variables in the middle of the chain."
                  , _react2.default.createElement('br', null), "3. Click the "
                     , _react2.default.createElement(_lucidereact.Eye, { size: 12, className: "inline",} ), " icon on any row to visualize that specific step."
                )
              )
            )
          )
        )

      )
    )
  );
} //exports.default = UnifiedFormulaBuilder;

const rootElement = document.getElementById("preview-app");
const root = ReactDOM.createRoot(rootElement);
root.render(React.createElement(UnifiedFormulaBuilder));

