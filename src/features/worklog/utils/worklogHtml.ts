export function extractLongText(wl: any) {
  return wl?.description_longdescription?.ldtext ??
         wl?.description_longdescription ??
         '';
}

export function buildHtmlPreview(html: string) {
  return `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  </head>
  <body style="font-family:Arial; padding:10px;">
    ${html || '—'}
  </body>
  </html>`;
}