import { parse } from './node_modules/.pnpm/regexparam@3.0.0/node_modules/regexparam/dist/index.js';

// Test 1: Does /admin/* match multi-segment paths?
const outer = parse('/admin/*');
console.log('Outer pattern:', outer.pattern);

const urls = [
  '/admin',
  '/admin/providers',
  '/admin/providers/eaffd014-13bd-43da-9a1b-2c3d4e5f6789',
  '/admin/qr/abc/simulate',
];

for (const url of urls) {
  const m = outer.pattern.exec(url);
  console.log(`  ${url} → ${m ? 'MATCH (wildcard: ' + m[1] + ')' : 'NO MATCH'}`);
}

// Test 2: Do inner routes with /admin/ prefix still match?
console.log('\nInner route matching (absolute paths inside wildcard):');
const inner1 = parse('/admin/providers/:id');
console.log('Inner pattern /admin/providers/:id:', inner1.pattern);
const testUrl = '/admin/providers/eaffd014-13bd-43da-9a1b-2c3d4e5f6789';
const m2 = inner1.pattern.exec(testUrl);
console.log(`  ${testUrl} → ${m2 ? 'MATCH (id: ' + m2[1] + ')' : 'NO MATCH'}`);
