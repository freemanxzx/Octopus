const prefix = 'markdown-body';

export const baseCSSContent = `
.${prefix}__hr {
  position: relative;
  margin: 20px 0;
  border: 0;
  border-top: 1px solid var(--md-primary-color);
  text-align: center;
}

.${prefix}__hr::before {
  content: '✂';
  position: absolute;
  top: -14px;
  left: 5%;
  color: var(--md-primary-color);
  font-size: 20px;
  line-height: 20px;
  background-color: #fff;
  padding: 0 10px;
  transform: translateX(-50%);
}
`

// Dynamically discover ALL CSS files in the directory and apply the ?raw interceptor via Vite's compiler
// @ts-ignore: Vite injects this dynamically at build time
const rawCssModules = import.meta.glob('./*.css', { as: 'raw', eager: true })

export const themeMap: Record<string, string> = {
  default: ''
}

// Convert paths like './wechat-bmpi-02-orange.css' into keys 'wechat-bmpi-02-orange'
for (const [path, cssContent] of Object.entries(rawCssModules)) {
  const themeName = path.replace('./', '').replace('.css', '')
  themeMap[themeName] = cssContent as string
}

export type ThemeName = keyof typeof themeMap
