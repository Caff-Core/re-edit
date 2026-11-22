// mutool run inspect.js file.pdf -> JSON summary (MuPDF is independent of both engines).
var doc = Document.openDocument(scriptArgs[0]).asPDF()
var out = { pages: [], fields: [] }
for (var i = 0; i < doc.countPages(); i++) {
  var page = doc.loadPage(i)
  var text = page.toStructuredText().asText().trim().split("\n")[0]
  var annots = page.getAnnotations().map(function (a) {
    return { type: a.getType(), contents: a.getContents(), rect: a.getBounds().map(Math.round) }
  })
  var widgets = page.getWidgets().map(function (w) {
    return { name: w.getName ? w.getName() : w.getLabel(), type: w.getFieldType(), value: w.getValue() }
  })
  out.pages.push({ first: text, rotate: page.getObject().get("Rotate").valueOf() || 0, annots: annots })
  out.fields = out.fields.concat(widgets)
}
print(JSON.stringify(out, null, 1))
