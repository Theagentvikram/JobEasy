"""
PDF generator for tailored resumes.
Converts markdown resume → clean PDF ready for upload.
"""
import re
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER


def generate_resume_pdf(markdown_text: str, output_dir: str = "uploads/resumes",
                         filename: str = None) -> str:
    """
    Convert markdown resume text to a clean PDF.
    Returns the output file path.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    if not filename:
        filename = f"resume_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = str(Path(output_dir) / filename)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = _build_styles()
    story = _parse_markdown(markdown_text, styles)

    doc.build(story)
    return output_path


def _build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle("name", parent=base["Normal"], fontSize=18, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#1a1a2e"), spaceAfter=2, alignment=TA_CENTER),
        "contact": ParagraphStyle("contact", parent=base["Normal"], fontSize=9, alignment=TA_CENTER,
                                  textColor=colors.HexColor("#555555"), spaceAfter=8),
        "h2": ParagraphStyle("h2", parent=base["Normal"], fontSize=11, fontName="Helvetica-Bold",
                             textColor=colors.HexColor("#1a1a2e"), spaceBefore=10, spaceAfter=3),
        "h3": ParagraphStyle("h3", parent=base["Normal"], fontSize=10, fontName="Helvetica-Bold",
                             textColor=colors.HexColor("#2d2d2d"), spaceBefore=6, spaceAfter=2),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=9.5, leading=14,
                               textColor=colors.HexColor("#333333")),
        "bullet": ParagraphStyle("bullet", parent=base["Normal"], fontSize=9.5, leading=13,
                                  leftIndent=15, firstLineIndent=-10, textColor=colors.HexColor("#333333")),
    }


def _parse_markdown(text: str, styles: dict) -> list:
    story = []
    lines = text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        if line.startswith("# "):
            story.append(Paragraph(line[2:], styles["name"]))
        elif line.startswith("## "):
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1a1a2e"), spaceAfter=4))
            story.append(Paragraph(line[3:].upper(), styles["h2"]))
        elif line.startswith("### "):
            story.append(Paragraph(line[4:], styles["h3"]))
        elif line.startswith("- "):
            bullet_text = "• " + line[2:]
            story.append(Paragraph(bullet_text, styles["bullet"]))
        elif line.startswith("**") and line.endswith("**"):
            story.append(Paragraph(f"<b>{line[2:-2]}</b>", styles["body"]))
        elif "|" in line and ("linkedin" in line.lower() or "@" in line or "github" in line.lower()):
            story.append(Paragraph(line, styles["contact"]))
        elif line:
            # Bold inline text
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
            story.append(Paragraph(formatted, styles["body"]))
        else:
            story.append(Spacer(1, 4))

        i += 1

    return story
