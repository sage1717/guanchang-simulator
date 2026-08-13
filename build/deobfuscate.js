// 去混淆脚本：解密 scarlet/index.html 的字符串数组 + 替换所有解密调用
// 方法：提取 prologue（数组+洗牌+解密函数），vm 执行捕获解密器，然后全文替换
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(process.argv[2], 'utf-8');

// 1. 提取 <script type="module"> 内容
const m = src.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('no module script found'); process.exit(1); }
const js = m[1];

// 2. 定位第一个 import（业务模块），prologue = 之前的部分
const importIdx = js.indexOf('import*as');
if (importIdx < 0) { console.error('no import found'); process.exit(1); }

// 2b. 解密函数 a0_0xfb23 定义在 import 之后（webpack runtime 区），靠函数提升供前段调用。
//     提取其函数体拼进 prologue，使 vm 里可解析。
const fbDef = js.match(/function\s+a0_0xfb23\s*\([^)]*\)\s*\{[^{}]*\}/);
if (!fbDef) { console.error('a0_0xfb23 def not found'); process.exit(1); }
console.log('a0_0xfb23 def extracted at', fbDef.index, 'len', fbDef[0].length);

const prologue = js.slice(0, importIdx) + '\n' + fbDef[0];

// 3. 在 vm 里执行 prologue 获取解密函数
const sandbox = {};
vm.createContext(sandbox);
try {
  vm.runInContext(prologue, sandbox);
} catch (e) {
  console.error('prologue exec failed:', e.message);
  process.exit(1);
}
const decrypt = sandbox.a0_0xfb23 || sandbox.a0_0x1dee98;
if (typeof decrypt !== 'function') {
  console.error('decryptor not captured; sandbox keys:', Object.keys(sandbox).slice(0, 20));
  process.exit(1);
}

// 4. 收集所有解密调用形式
const callRe = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*(0x[0-9a-fA-F]+|'[^']*'|"[^"]*")\s*\)/g;
const aliases = new Set(['a0_0x1dee98', 'a0_0xfb23']);
// 先找别名：const _0xXXXX = a0_0xfb23 / const _0xXXXX=a0_0x1dee98
const aliasRe = /const\s+(_0x[0-9a-fA-F]+|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(a0_0xfb23|a0_0x1dee98)\s*;/g;
let am;
while ((am = aliasRe.exec(js))) aliases.add(am[1]);
console.log('aliases:', [...aliases].join(', '));

// 5. 替换（从后往前，避免偏移问题——直接一次性全局替换，字符串值用 JSON.stringify 保证合法）
let out = js;
let replaced = 0;
const uniqueCalls = new Set();
const values = new Map();
let cm;
const allCallRe = new RegExp('\\b(' + [...aliases].join('|') + ')\\s*\\(\\s*(0x[0-9a-fA-F]+|\'[^\']*\'|"[^"]*")\\s*\\)', 'g');
while ((cm = allCallRe.exec(js))) {
  const fnName = cm[1], arg = cm[2];
  let key;
  if (/^0x/.test(arg)) key = parseInt(arg, 16);
  else key = arg.slice(1, -1);
  const ukey = fnName + ':' + String(key);
  if (values.has(ukey)) continue;
  let val;
  try { val = typeof key === 'number' ? decrypt(key) : decrypt(key); }
  catch (e) { console.error('decrypt failed', fnName, arg, e.message); val = undefined; }
  values.set(ukey, val);
}
// 二次遍历真正替换
out = js.replace(allCallRe, (full, fnName, arg) => {
  const key = /^0x/.test(arg) ? parseInt(arg, 16) : arg.slice(1, -1);
  const val = values.get(fnName + ':' + String(key));
  if (val === undefined) { return full; }
  replaced++;
  return JSON.stringify(val);
});

console.log('decrypted calls replaced:', replaced, '/ unique:', values.size);
fs.writeFileSync(process.argv[3], out, 'utf-8');
console.log('output written:', process.argv[3], out.length, 'chars');
