"""Builds the PDF spike fixtures with reportlab, independent of both engines."""
import os, subprocess, sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import black, yellow

out = sys.argv[1]
W, H = A4

def form():
    c = canvas.Canvas(f"{out}/form.pdf", pagesize=A4)
    c.setTitle("Spike form")
    c.setFont("Helvetica-Bold", 20); c.drawString(72, H - 72, "PAGE ONE FORM")
    c.setFont("Helvetica", 12)
    f = c.acroForm
    c.drawString(72, H - 120, "Name:")
    f.textfield(name="name", x=140, y=H - 130, width=200, height=20, value="")
    c.drawString(72, H - 160, "Agree:")
    f.checkbox(name="agree", x=140, y=H - 165, size=14, checked=False)
    c.drawString(72, H - 200, "Color:")
    f.radio(name="color", value="red", x=140, y=H - 205, size=14, selected=True)
    f.radio(name="color", value="green", x=180, y=H - 205, size=14, selected=False)
    c.drawString(72, H - 240, "Size:")
    f.choice(name="size", options=["S", "M", "L"], value="S", x=140, y=H - 250, width=80, height=20)
    c.drawString(72, H - 290, "Tags (list box):")
    f.listbox(name="tags", options=["a", "b", "c"], value="a", x=180, y=H - 340, width=80, height=60)
    c.showPage()
    for label in ["PAGE TWO", "PAGE THREE", "PAGE FOUR"]:
        c.setFont("Helvetica-Bold", 20); c.drawString(72, H - 72, label)
        c.setFont("Helvetica", 12)
        c.drawString(72, H - 110, f"Highlight target on {label.lower()}.")
        c.showPage()
    c.save()

def scanned():
    # A page that is only an image: render a text page to PNG with poppler, then place it.
    tmp = f"{out}/_scan_src.pdf"
    c = canvas.Canvas(tmp, pagesize=A4)
    c.setFont("Helvetica-Bold", 20); c.drawString(72, H - 72, "SCANNED PAGE")
    c.save()
    subprocess.run(["pdftoppm", "-png", "-r", "72", "-singlefile", tmp, f"{out}/_scan"], check=True)
    c = canvas.Canvas(f"{out}/scanned.pdf", pagesize=A4)
    c.drawImage(f"{out}/_scan.png", 0, 0, W, H)
    c.showPage(); c.save()
    os.remove(tmp); os.remove(f"{out}/_scan.png")

def annotated():
    c = canvas.Canvas(f"{out}/annotated.pdf", pagesize=A4)
    c.setFont("Helvetica-Bold", 20); c.drawString(72, H - 72, "ANNOTATED PAGE")
    c.textAnnotation("Existing note", Rect=(72, H - 140, 92, H - 120), relative=0)
    c.highlightAnnotation("Existing highlight", Rect=(70, H - 78, 280, H - 52), relative=0, Color=[1, 1, 0])
    c.showPage()
    c.setFont("Helvetica-Bold", 20); c.drawString(72, H - 72, "SECOND PAGE")
    c.showPage(); c.save()

form(); scanned(); annotated()
# Encrypted copies: owner password only (opens without a password), and a user password.
subprocess.run(["mutool", "clean", "-E", "aes-256", "-O", "owner", f"{out}/form.pdf", f"{out}/encrypted-owner.pdf"], check=True)
subprocess.run(["mutool", "clean", "-E", "aes-256", "-U", "user", "-O", "owner", f"{out}/form.pdf", f"{out}/encrypted-user.pdf"], check=True)
print("fixtures ok")
