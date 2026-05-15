import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { writeFileSync } from 'fs'

const SVG = `
<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="44" height="44" rx="10" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7b6fff"/>
      <stop offset="100%" stop-color="#4f3fff"/>
    </linearGradient>
  </defs>
  <!-- Picture frame outer -->
  <rect x="7" y="9" width="30" height="26" rx="3" fill="white"/>
  <!-- Picture frame inner -->
  <rect x="10" y="12" width="24" height="18" rx="2" fill="#4f3fff"/>
  <!-- Mountains -->
  <polygon points="13,26 18.5,18 24,26" fill="white" opacity="0.6"/>
  <polygon points="20,26 27,16 34,26" fill="white"/>
  <!-- Sun -->
  <circle cx="28.5" cy="15.5" r="2.5" fill="white" opacity="0.85"/>
</svg>
`

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

const pngs = sizes.map((size) => {
  const resvg = new Resvg(SVG, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
})

writeFileSync('resources/icon.png', pngs[pngs.length - 1])
console.log('icon.png written (1024px)')

const icoBuffer = await pngToIco(pngs.slice(0, 6))
writeFileSync('build/icon.ico', icoBuffer)
console.log('icon.ico written')

const icns256 = pngs[5]
writeFileSync('build/icon.icns', icns256)
console.log('build/icon.icns written (placeholder — use iconutil on Mac for production)')
