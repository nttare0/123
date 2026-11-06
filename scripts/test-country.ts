import assert from "node:assert/strict"
import handler from "../api/country.ts"

for (const [input, expected] of [
  ["RW", "RW"], ["MZ", "MZ"], ["US", "US"], [undefined, null],
  ["XX", null], ["ZZ", null], ["rw", null], ["Africa/Maputo", null], [["RW", "MZ"], null],
] as const) {
  const headers: Record<string, string> = {}
  let result: unknown
  handler({ headers: { "x-vercel-ip-country": Array.isArray(input) ? [...input] : input as string | undefined } }, {
    setHeader: (name, value) => { headers[name] = value },
    status: (code) => { assert.equal(code, 200); return { json: (body) => { result = body } } },
  })
  assert.deepEqual(result, { country: expected })
  assert.equal(headers["Cache-Control"], "private, no-store")
  assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store")
}
console.log("Country endpoint: 9 cases passed; private/no-store headers verified.")
