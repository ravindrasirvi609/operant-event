"""
Generate Operant-Event-User-Guide.docx from the markdown source.
Uses python-docx directly — no pandoc required.
Run: python docs/user-guide/generate_docx.py
"""

import os, re
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(HERE, "images")
OUT_PATH = os.path.join(HERE, "Operant-Event-User-Guide.docx")

# ── helpers ────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color):
    """Shade a table cell with a hex colour (no #)."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def add_horizontal_rule(doc):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "CCCCCC")
    pBdr.append(bottom)
    pPr.append(pBdr)

def para_space(doc, before=0, after=120):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    return p

def add_caption(doc, text):
    p = doc.add_paragraph(text)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(10)
    run = p.runs[0]
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

def add_image(doc, filename, caption, width=Inches(5.8)):
    path = os.path.join(IMG_DIR, filename)
    if os.path.exists(path):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.add_picture(path, width=width)
        add_caption(doc, caption)
    else:
        doc.add_paragraph(f"[Image not found: {filename}]")

def style_table(table):
    """Alternating-row shading + header bold."""
    for i, row in enumerate(table.rows):
        for j, cell in enumerate(row.cells):
            if i == 0:
                set_cell_bg(cell, "2563EB")
                for p in cell.paragraphs:
                    for run in p.runs:
                        run.bold = True
                        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            elif i % 2 == 0:
                set_cell_bg(cell, "EFF6FF")

def add_callout(doc, text):
    """A visually distinct 'Tip' box rendered as a single-cell table."""
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    cell = t.cell(0, 0)
    set_cell_bg(cell, "FFFBEB")
    p = cell.paragraphs[0]
    run = p.add_run("💡  " + text)
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(0x92, 0x40, 0x00)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    doc.add_paragraph()  # spacer after

# ── document setup ─────────────────────────────────────────────────────────

doc = Document()

# Page margins
section = doc.sections[0]
section.page_width  = Cm(21)
section.page_height = Cm(29.7)
section.left_margin   = Cm(2.5)
section.right_margin  = Cm(2.5)
section.top_margin    = Cm(2.5)
section.bottom_margin = Cm(2.5)

# Custom styles
styles = doc.styles

def ensure_style(name, base_name, size, bold=False, color_hex=None, space_before=6, space_after=3):
    if name not in [s.name for s in styles]:
        st = styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        st.base_style = styles[base_name]
    else:
        st = styles[name]
    font = st.font
    font.size = Pt(size)
    font.bold = bold
    if color_hex:
        r = int(color_hex[0:2], 16)
        g = int(color_hex[2:4], 16)
        b = int(color_hex[4:6], 16)
        font.color.rgb = RGBColor(r, g, b)
    pf = st.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after  = Pt(space_after)
    return st

ensure_style("OE Body",      "Normal",    10.5, space_before=0, space_after=6)
ensure_style("OE H1",        "Heading 1", 22,   bold=True,  color_hex="1E3A5F", space_before=18, space_after=6)
ensure_style("OE H2",        "Heading 2", 16,   bold=True,  color_hex="2563EB", space_before=14, space_after=4)
ensure_style("OE H3",        "Heading 3", 12,   bold=True,  color_hex="1D4ED8", space_before=10, space_after=3)
ensure_style("OE Bullet",    "List Bullet", 10.5, space_before=0, space_after=3)

# ── title page ─────────────────────────────────────────────────────────────

doc.add_paragraph()
doc.add_paragraph()

tp = doc.add_paragraph("Operant Event")
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = tp.runs[0]
run.font.size = Pt(32)
run.bold = True
run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x5F)
tp.paragraph_format.space_after = Pt(8)

sub = doc.add_paragraph("Complete User Guide")
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = sub.runs[0]
run.font.size = Pt(18)
run.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
sub.paragraph_format.space_after = Pt(4)

tagline = doc.add_paragraph(
    "A Plain-English Guide to Running Conferences, Managing Papers,\n"
    "Reviews, Registrations, and More"
)
tagline.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = tagline.runs[0]
run.font.size = Pt(11)
run.italic = True
run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
tagline.paragraph_format.space_after = Pt(24)

add_horizontal_rule(doc)

meta_lines = [
    ("Version",        "1.0"),
    ("Prepared",       "September 2026"),
    ("Audience",       "Organizers, Reviewers, Authors, Attendees, Speakers, and Event Staff"),
    ("Reading time",   "Approximately 45–60 minutes"),
]
for label, value in meta_lines:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p.add_run(label + ":  ")
    r1.bold = True
    r1.font.size = Pt(10)
    r2 = p.add_run(value)
    r2.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(2)

doc.add_page_break()

# ── table of contents heading ──────────────────────────────────────────────

toc_h = doc.add_paragraph("Table of Contents", style="OE H1")

toc_entries = [
    ("1",  "Welcome to Operant Event"),
    ("2",  "Who Uses This Application"),
    ("3",  "Where Do You Log In? The Six Portals"),
    ("4",  "Getting Started: Creating Your Account"),
    ("5",  "Your Organization: The Workspace Behind Every Event"),
    ("6",  "Managing Your Team: Members, Roles & Permissions"),
    ("7",  "Conferences: The Life of an Event"),
    ("8",  "Setting Up a New Conference"),
    ("9",  "Tracks and the Submission Form Builder"),
    ("10", "Submitting a Paper: The Author's Journey"),
    ("11", "The Peer Review Process"),
    ("12", "Registration and Payments"),
    ("13", "Building the Conference Programme"),
    ("14", "Event Day: Checking In Delegates"),
    ("15", "Certificates"),
    ("16", "Sponsors and Exhibitors"),
    ("17", "Notifications and Automated Emails"),
    ("18", "Reports and Dashboards"),
    ("19", "Exporting and Importing Data"),
    ("20", "Your Account and Security"),
    ("21", "Roles and Permissions Reference"),
    ("22", "What This Application Does Not Do Yet"),
    ("23", "Frequently Asked Questions"),
    ("24", "Glossary of Terms"),
]
for num, title in toc_entries:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = Pt(1)
    r = p.add_run(f"  {num}.  {title}")
    r.font.size = Pt(10.5)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════
#  SECTION CONTENT
# ══════════════════════════════════════════════════════════════════════════

def h1(text): return doc.add_paragraph(text, style="OE H1")
def h2(text): return doc.add_paragraph(text, style="OE H2")
def h3(text): return doc.add_paragraph(text, style="OE H3")
def body(text):
    p = doc.add_paragraph(text, style="OE Body")
    return p
def bullet(text):
    p = doc.add_paragraph(style="OE Bullet")
    p.add_run(text)
    return p

# ── Section 1 ──────────────────────────────────────────────────────────────
h1("1. Welcome to Operant Event")
body(
    "Operant Event is a complete, all-in-one platform for planning and running conferences, "
    "seminars, and academic or professional events — from the very first announcement to handing "
    "out certificates after the closing ceremony."
)
body(
    "Think of it as the digital 'control room' for your event. Instead of juggling spreadsheets "
    "for paper submissions, a separate tool for collecting registration fees, a mailing list for "
    "reminders, and a printed sign-in sheet at the door, everything lives in one connected system:"
)
bullets_s1 = [
    "Researchers and speakers submit their papers or abstracts online and track their status.",
    "Your review committee evaluates submissions and records decisions — accept, reject, request changes, or waitlist.",
    "Delegates register and pay online, and instantly receive a personal QR code.",
    "Your team builds the day-by-day programme, assigning speakers and sessions.",
    "On the big day, staff check people in with a quick scan at the door.",
    "After the event, the system automatically works out who has earned a certificate and lets you issue them with one click.",
    "Throughout, everyone receives automatic email updates at the right moments — no one has to remember to send them.",
]
for b in bullets_s1:
    bullet(b)
body(
    "One organization can run as many conferences as it likes, and each conference moves through "
    "the same clear, predictable stages described in Section 7."
)
body(
    "This guide is written for everyone who touches the system — not just the people setting it "
    "up. Whether you're an event organizer, a committee member reviewing papers, an author "
    "submitting your research, a delegate registering to attend, or a volunteer scanning badges "
    "at the entrance, this guide has a section written for you."
)
add_callout(doc, "How to use this guide: You don't need to read it front to back. Use the Table of Contents to jump straight to the section that matches what you're trying to do right now.")

add_horizontal_rule(doc)

# ── Section 2 ──────────────────────────────────────────────────────────────
h1("2. Who Uses This Application")
body(
    "Operant Event is built around two broad groups of people: the team that organizes the event, "
    "and the people who take part in it. Nobody needs special software or training — everything "
    "happens through a normal web browser."
)
add_image(doc, "diagram1_roles.png", "Figure 1 — Everyone who uses Operant Event and the role they play")

h3("Your Organizing Team")
body(
    "These are the people inside your organization (your society, university, or event company) "
    "who plan and run the show. They log in to a shared organizer back-office."
)
t = doc.add_table(rows=5, cols=2)
t.style = "Table Grid"
headers = ["Role", "In plain terms"]
rows_data = [
    ("Organization Owner",
     "The person who created the workspace, or someone promoted to full control. Can do absolutely everything, including deciding who else gets which powers."),
    ("Organization Admin",
     "Almost as powerful as the Owner — can manage every part of every conference and the whole team — except they cannot hand out or change high-level roles."),
    ("Conference Admin",
     "The day-to-day event manager. Runs registration, payments, the programme, check-in, certificates, sponsors, and reporting. Does not handle the academic review side."),
    ("Track Chair",
     "The academic/scientific lead. Manages the reviewer pool, assigns papers to reviewers, and makes final accept/reject decisions. Does not handle money or logistics."),
]
for i, (h, v) in enumerate([("Role", "In plain terms")] + rows_data):
    row = t.rows[i]
    row.cells[0].text = h
    row.cells[1].text = v
style_table(t)
doc.add_paragraph()

h3("Everyone Who Takes Part in Your Event")
body(
    "These people never need to be added to your organization's team. They simply create a free "
    "personal account and the system automatically gives them the right screens."
)
t2 = doc.add_table(rows=7, cols=2)
t2.style = "Table Grid"
participant_rows = [
    ("Who they are", "What they do in the system"),
    ("Author / Submitter", "Submits papers, abstracts, or proposals to one of your conferences."),
    ("Reviewer", "A subject-matter expert invited by the Track Chair to evaluate assigned papers."),
    ("Attendee / Registrant", "Registers to attend, pays the applicable fee, and checks in on the day."),
    ("Speaker / Session Chair", "Presents at or chairs a session — added to the programme by your team."),
    ("Check-in Staff", "Uses the purpose-built scanning screen on event day at the registration desk."),
    ("Exhibitor / Sponsor contact", "Tracked as a record by your team — does not currently have a self-service login."),
]
for i, (a, b) in enumerate(participant_rows):
    row = t2.rows[i]
    row.cells[0].text = a
    row.cells[1].text = b
style_table(t2)
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 3 ──────────────────────────────────────────────────────────────
h1("3. Where Do You Log In? The Six Portals")
body(
    "Operant Event shows a different, purpose-built screen depending on who you are — so a "
    "delegate never has to wade through organizer settings, and an author never sees a reviewer's "
    "scoring form by mistake."
)
add_image(doc, "diagram7_portals.png", "Figure 2 — The six portals and who uses each one")
t3 = doc.add_table(rows=7, cols=3)
t3.style = "Table Grid"
portal_rows = [
    ("Portal", "Who uses it", "What it's for"),
    ("Organizer Back-Office", "Organizing team", "Setting up and running conferences end-to-end"),
    ("Author Portal", "Paper submitters", "The submission wizard and 'My Abstracts' list"),
    ("Reviewer Portal", "Reviewers", "'My Reviews' — assignments and the scoring form"),
    ("Participant Portal", "Attendees / delegates", "Choosing a category, paying, viewing tickets"),
    ("Check-in Kiosk", "Registration desk staff", "Full-screen QR scanning on event day"),
    ("Public Pages", "Anyone", "Sign up, sign in, public programme, certificate verification"),
]
for i, row_data in enumerate(portal_rows):
    row = t3.rows[i]
    for j, val in enumerate(row_data):
        row.cells[j].text = val
style_table(t3)
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 4 ──────────────────────────────────────────────────────────────
h1("4. Getting Started: Creating Your Account")
body("Everyone starts the same way — with a free personal account.")
steps = [
    "Go to the sign-up page (shared by your organizer, or linked from a conference's public page).",
    "Enter your name, email address, and a password. The system tells you immediately if your password is too weak.",
    "Check your inbox — you'll receive a welcome email confirming your account is active.",
    "Sign in. This one login works everywhere in Operant Event — as an author, reviewer, delegate, or organizer.",
]
for i, s in enumerate(steps, 1):
    p = doc.add_paragraph(style="OE Bullet")
    r = p.add_run(f"Step {i}:  ")
    r.bold = True
    p.add_run(s)

body(
    "If you were invited by an organizer: you'll receive an invitation email with a special link. "
    "Clicking it lets you set your password and immediately access the organizer back-office with "
    "the role you were invited to hold."
)
body(
    "One account, many hats: the same email and password can be an Organization Owner for your "
    "own society's conferences, a Reviewer for someone else's conference, and an Attendee "
    "registering for a third — all at once."
)
add_horizontal_rule(doc)

# ── Section 5 ──────────────────────────────────────────────────────────────
h1("5. Your Organization: The Workspace Behind Every Event")
body(
    "An Organization is the umbrella workspace for everything your society, university department, "
    "or event company does in Operant Event. Every conference belongs to exactly one organization."
)
h3("What Lives Inside an Organization")
items = [
    "Every conference you've ever run or are currently planning — visible in one dashboard.",
    "Your whole team — everyone with organizer-side access and their role.",
    "Organization-wide settings — branding, default email sender address, and payment gateway connections.",
    "Cross-conference reporting — see totals and trends across every event, not just one at a time.",
]
for it in items: bullet(it)
body(
    "Multiple organizations: a freelance conference manager can belong to more than one "
    "organization. When they log in, they simply pick which workspace to work in — each one's "
    "data, team, and conferences stay completely separate."
)
add_horizontal_rule(doc)

# ── Section 6 ──────────────────────────────────────────────────────────────
h1("6. Managing Your Team: Members, Roles & Permissions")
h3("Inviting a Team Member")
steps6 = [
    "Open Team → Members in the organizer back-office.",
    "Click Invite Member, enter their email, and choose their role.",
    "They receive an invitation email. Once accepted, they appear in your member list.",
]
for s in steps6: bullet(s)
h3("Built-in Roles vs. Custom Roles")
body(
    "Operant Event ships with four ready-made roles: Organization Owner, Organization Admin, "
    "Conference Admin, and Track Chair. For most organizations, these are all you'll ever need."
)
body(
    "If you need something more specialized — say, a Finance Officer who sees payment reports "
    "but nothing else — an Owner can build a custom role by selecting exactly which individual "
    "permissions it should have from the full permission catalogue (see Section 21)."
)
h3("Per-Conference Assignment")
body(
    "Conference Admin and Track Chair are assigned per conference — one person can be Conference "
    "Admin for one event while someone else manages a different event in the same organization."
)
add_horizontal_rule(doc)

# ── Section 7 ──────────────────────────────────────────────────────────────
h1("7. Conferences: The Life of an Event")
body(
    "Every conference moves through the same series of clear stages — from a first idea to a "
    "wrapped-up archive."
)
add_image(doc, "diagram2_lifecycle.png", "Figure 3 — The seven stages of a conference lifecycle")
t7 = doc.add_table(rows=8, cols=2)
t7.style = "Table Grid"
lifecycle_rows = [
    ("Stage", "What's happening"),
    ("Draft", "Private idea — filling in details; nothing visible to the public yet."),
    ("Published", "Public page is live; abstract submission and/or registration may be open."),
    ("Submissions Open", "Authors can submit papers/abstracts to your tracks."),
    ("Under Review", "Submissions closed; reviewers and Track Chair are evaluating them."),
    ("Programme Building", "Decisions are in; team assembles the day-by-day schedule."),
    ("Live / Ongoing", "The event is happening; check-in is active."),
    ("Completed / Archived", "Event ended; certificates can be issued; final reports available."),
]
for i, (a, b) in enumerate(lifecycle_rows):
    row = t7.rows[i]
    row.cells[0].text = a
    row.cells[1].text = b
style_table(t7)
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 8 ──────────────────────────────────────────────────────────────
h1("8. Setting Up a New Conference")
body("Creating a conference is a guided, step-by-step process. You can adjust any of these later.")
setup_steps = [
    ("Basic details", "Name, short description, start and end dates, time zone, and venue."),
    ("Branding", "Upload a logo and choose accent colours so public pages feel like your event."),
    ("Feature toggles", "Turn on only what this conference needs: Abstract Submissions, Peer Review, Paid Registration, Certificates, Sponsors."),
    ("Tracks", "Create subject tracks authors can submit to (if abstracts are enabled)."),
    ("Registration categories", "Define who can register and at what price (if registration is enabled)."),
    ("Publish", "Move from Draft to Published when you're ready for the public to see it."),
]
for num, (label, desc) in enumerate(setup_steps, 1):
    p = doc.add_paragraph(style="OE Bullet")
    r = p.add_run(f"{num}. {label}:  ")
    r.bold = True
    p.add_run(desc)
add_callout(doc, "Cloning: running the same annual event? Duplicate a previous conference — carrying over its tracks, form fields, and registration categories — then update the dates.")
add_horizontal_rule(doc)

# ── Section 9 ──────────────────────────────────────────────────────────────
h1("9. Tracks and the Submission Form Builder")
body(
    "A Track is a subject area that authors submit to — for example, 'Machine Learning' or "
    "'Poster Presentations'. Each track has its own Track Chair, reviewer pool, and custom "
    "submission form."
)
h3("The Submission Form Builder")
body("The form builder offers a library of field types:")
t9 = doc.add_table(rows=8, cols=2)
t9.style = "Table Grid"
field_rows = [
    ("Field type", "What it collects"),
    ("Short text", "One-line answers: a title, author name, affiliation"),
    ("Long text / rich text", "Multi-paragraph text — ideal for the abstract body"),
    ("Dropdown", "One selection from a fixed list you define"),
    ("Checkboxes", "One or more selections from a list"),
    ("File upload", "PDF, DOCX, or other files up to the maximum size shown"),
    ("Date picker", "A calendar selector"),
    ("Author / co-author block", "Repeating group for each author's name, affiliation, email, ORCID"),
]
for i, (a, b) in enumerate(field_rows):
    row = t9.rows[i]
    row.cells[0].text = a
    row.cells[1].text = b
style_table(t9)
doc.add_paragraph()
add_callout(doc, "Tip: Changing a form after authors have already submitted will not retroactively alter existing submissions — plan your form before opening submissions.")
add_horizontal_rule(doc)

# ── Section 10 ──────────────────────────────────────────────────────────────
h1("10. Submitting a Paper: The Author's Journey")
body("If you're an author submitting a paper to a conference, this section is written for you.")
add_image(doc, "diagram3_abstract.png", "Figure 4 — The five steps of the abstract submission journey")
h3("Step 1 — Find the Conference and Track")
body("The organization will share a link to the submission page. Select the track you're submitting to and click Submit to this track.")
h3("Step 2 — Create or Sign In to Your Account")
body("If you don't have an account yet, you'll be prompted to create one — name, email, password. Free, takes under a minute.")
h3("Step 3 — Fill In the Submission Form")
body("Work through the form. Fields marked * are required. You can Save Draft at any time and return later — your draft is private until you actually submit.")
h3("Step 4 — Submit")
body("Click Submit. You'll see a confirmation page and receive an email confirmation immediately. Keep it — it's your record of arrival before the deadline.")
h3("Step 5 — Track Your Submission")
body("Sign in any time and go to My Submissions. Possible statuses:")
status_rows = [
    ("Status", "What it means"),
    ("Submitted", "Received and queued for reviewer assignment."),
    ("Under Review", "Reviewers are currently reading and scoring your work."),
    ("Revision Requested", "The Track Chair has asked for changes before a final decision."),
    ("Accepted", "Your paper has been accepted for the conference."),
    ("Waitlisted", "May still be included if space allows after all decisions."),
    ("Rejected", "Not accepted for this round."),
    ("Withdrawn", "You withdrew the submission yourself."),
]
t10 = doc.add_table(rows=len(status_rows), cols=2)
t10.style = "Table Grid"
for i, (a, b) in enumerate(status_rows):
    t10.rows[i].cells[0].text = a
    t10.rows[i].cells[1].text = b
style_table(t10)
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 11 ──────────────────────────────────────────────────────────────
h1("11. The Peer Review Process")
h3("For the Organizing Team (Track Chair)")
body("Once submissions close, the Track Chair manages the review pipeline in four steps:")
review_steps = [
    ("Build the Reviewer Pool", "Add reviewers by email (Track → Reviewers → Add Reviewers). New reviewers receive an invitation; existing account-holders are in immediately."),
    ("Assign Papers", "Use Auto-assign for even distribution or Manual assign for expertise matching. Each paper can have multiple reviewers."),
    ("Monitor Progress", "The Assignments dashboard shows how many reviews each reviewer has completed and how many are overdue. Send nudge reminders from this screen."),
    ("Record the Final Decision", "After reviews are in, the Track Chair records Accept, Reject, Revision, or Waitlist. Authors are notified automatically."),
]
for label, desc in review_steps:
    p = doc.add_paragraph(style="OE Bullet")
    r = p.add_run(f"{label}:  ")
    r.bold = True
    p.add_run(desc)

h3("For Reviewers")
reviewer_steps = [
    "Accept the invitation email.",
    "Open 'My Reviews' — a list of every paper assigned to you with deadlines.",
    "Read the paper and fill in the review form (scores, comments to authors, confidential comments to chair, overall recommendation).",
    "Declare a Conflict of Interest if you know the author or have any other reason you can't review impartially — the paper is then reassigned.",
    "Submit your review. You can edit it while the review window is still open.",
]
for s in reviewer_steps: bullet(s)
add_horizontal_rule(doc)

# ── Section 12 ──────────────────────────────────────────────────────────────
h1("12. Registration and Payments")
add_image(doc, "diagram4_registration.png", "Figure 5 — The registration and payment flow for delegates")
h3("For Delegates")
delegate_steps = [
    "Find the registration page (linked by the organizer) and review available registration categories.",
    "Select your category (e.g. Early Bird, Student, Day Pass). Categories have capacity limits — if 'Sold out', choose an alternative.",
    "Fill in your details and answer any additional questions (dietary needs, T-shirt size).",
    "Pay online by card (Razorpay or Stripe) or by bank transfer if the organizer allows it.",
    "Receive your confirmation email with a personal QR code and PDF ticket.",
    "View your ticket anytime under My Registrations.",
]
for i, s in enumerate(delegate_steps, 1):
    p = doc.add_paragraph(style="OE Bullet")
    p.add_run(f"Step {i}: ").bold = True
    p.add_run(s)

h3("For the Organizing Team — Setting Up Registration Categories")
body("Open Conference → Registration → Categories → Add Category. For each category:")
cat_rows = [
    ("Setting", "What it does"),
    ("Name", "What delegates see (e.g. 'Academic / Full Access')"),
    ("Price", "Amount charged; set to 0 for a free category"),
    ("Currency", "Selected once per conference — shared by all categories"),
    ("Capacity", "Maximum registrations in this category (blank = unlimited)"),
    ("Visibility period", "Dates between which this category is available — use for early-bird pricing"),
    ("Included items", "Optional description of what this ticket includes"),
]
t12 = doc.add_table(rows=len(cat_rows), cols=2)
t12.style = "Table Grid"
for i, (a, b) in enumerate(cat_rows):
    t12.rows[i].cells[0].text = a
    t12.rows[i].cells[1].text = b
style_table(t12)
doc.add_paragraph()
add_callout(doc, "Note: Discount codes and coupon codes are not available in the current version. See Section 22 for a full list of features not yet built.")
add_horizontal_rule(doc)

# ── Section 13 ──────────────────────────────────────────────────────────────
h1("13. Building the Conference Programme")
body("Once papers are accepted, build the public-facing timetable that speakers and attendees follow.")
prog_steps = [
    ("Add your days", "Pre-filled from conference dates; add or remove as needed."),
    ("Add rooms / venues", "Name each space: 'Main Hall', 'Meeting Room A', 'Online Stream 2'."),
    ("Add sessions", "Pick a day, room, start/end time, and title. Mark breaks or special events distinctively."),
    ("Add session items", "Link accepted abstracts (title/authors pull in automatically) or add free-form items for keynotes and invited talks."),
    ("Assign speakers", "Link to an Operant Event account for certificate eligibility, or enter as a free-form name."),
    ("Set a session chair", "Assign a chair by account or free-form name."),
]
for label, desc in prog_steps:
    p = doc.add_paragraph(style="OE Bullet")
    r = p.add_run(f"{label}:  ")
    r.bold = True
    p.add_run(desc)
add_callout(doc, "Publishing: the programme is private until you click 'Publish Programme'. Once published, updates take effect immediately — great for last-minute room swaps on the day.")
add_horizontal_rule(doc)

# ── Section 14 ──────────────────────────────────────────────────────────────
h1("14. Event Day: Checking In Delegates")
add_image(doc, "diagram5_checkin.png", "Figure 6 — Event-day check-in: two routes to confirming arrival")
h3("Before the Day")
body("Ensure all desk staff have the Check-in Staff permission (or higher) in Team → Members.")
h3("On the Day: Two Ways to Check Someone In")
body("Option A — Scan QR Code (Recommended): Click the camera/scanner button and hold the delegate's QR code up to the camera. The system shows a green tick and marks them checked in in about two seconds.")
body("Option B — Name or Email Search: Type into the search box to find the registrant, verify identity verbally, then click Check In.")
h3("Real-time Counts")
body("A live counter at the top of the kiosk shows expected registrants, checked-in so far, and still expected — updating instantly across all simultaneously-running devices.")
add_callout(doc, "Session-level check-in: if your conference has ticketed workshops or a gala dinner, enable session-level check-in so staff pick a session first and each has its own attendee list.")
add_horizontal_rule(doc)

# ── Section 15 ──────────────────────────────────────────────────────────────
h1("15. Certificates")
add_image(doc, "diagram6_certificates.png", "Figure 7 — Certificate eligibility check and issuance process")
h3("Types of Certificates")
cert_rows = [
    ("Type", "Typically goes to"),
    ("Attendance Certificate", "Delegates who registered and checked in"),
    ("Presentation Certificate", "Speakers whose paper or talk appeared in the programme"),
    ("Review Certificate", "Reviewers who completed at least the minimum number of assigned reviews"),
]
t15 = doc.add_table(rows=len(cert_rows), cols=2)
t15.style = "Table Grid"
for i, (a, b) in enumerate(cert_rows):
    t15.rows[i].cells[0].text = a
    t15.rows[i].cells[1].text = b
style_table(t15)
doc.add_paragraph()
h3("Issuing Certificates")
cert_steps = [
    "Go to Certificates in the back-office after the event ends and check-in is closed.",
    "Click Check Eligibility — the system evaluates everyone against the conditions you set.",
    "Review the eligibility list; manually override if needed.",
    "Click Issue Certificates — personalized PDFs are generated and download links emailed automatically.",
]
for i, s in enumerate(cert_steps, 1):
    p = doc.add_paragraph(style="OE Bullet")
    p.add_run(f"Step {i}: ").bold = True
    p.add_run(s)
add_callout(doc, "Verification: every certificate has a unique code. Anyone can visit the public conference page and enter the code to confirm the certificate is genuine — no account required.")
add_horizontal_rule(doc)

# ── Section 16 ──────────────────────────────────────────────────────────────
h1("16. Sponsors and Exhibitors")
body("Track your event's financial supporters and exhibitors inside the same system you use for everything else.")
h3("Sponsors")
body("Go to Conference → Sponsors → Add Sponsor. Record the company name, logo, sponsorship tier, website, payment status, and any internal notes. Sponsors with logos appear on the public conference page in tier order.")
h3("Exhibitors")
body("Tracked similarly — company name, contact person, booth number, payment status. Currently managed entirely by your team; exhibitors do not have a self-service portal.")
add_horizontal_rule(doc)

# ── Section 17 ──────────────────────────────────────────────────────────────
h1("17. Notifications and Automated Emails")
body("Operant Event sends emails at every key moment automatically — no one has to remember to trigger them.")
email_rows = [
    ("Trigger", "Recipient"),
    ("Account created", "New user"),
    ("Password reset requested", "Requesting user"),
    ("Conference invitation (organizer)", "Invited team member"),
    ("Reviewer invitation", "Invited reviewer"),
    ("Abstract submitted", "Author (confirmation)"),
    ("Abstract status changed", "Author"),
    ("Review assigned", "Reviewer"),
    ("Registration confirmed", "Registrant"),
    ("Registration pending (awaiting manual payment)", "Registrant"),
    ("Certificate issued", "Certificate recipient"),
]
t17 = doc.add_table(rows=len(email_rows), cols=2)
t17.style = "Table Grid"
for i, (a, b) in enumerate(email_rows):
    t17.rows[i].cells[0].text = a
    t17.rows[i].cells[1].text = b
style_table(t17)
doc.add_paragraph()
h3("Customizing Email Templates")
body("Go to Settings → Email Templates to edit the subject line and body of any automatic email. Use merge fields (e.g. {{author_name}}, {{conference_name}}) for personalization. A preview mode shows how the email looks with sample data.")
h3("Sending a Manual Broadcast")
body("Use Communications → Broadcast to send a one-off message to a specific audience — all registrants, reviewers with pending reviews, accepted speakers, etc.")
add_horizontal_rule(doc)

# ── Section 18 ──────────────────────────────────────────────────────────────
h1("18. Reports and Dashboards")
body("The conference home dashboard gives an at-a-glance view: submission counts by status, registration counts by category, review progress, check-in totals, revenue summary, and upcoming tasks.")
h3("Detailed Reports Available")
report_rows = [
    ("Report", "What it shows"),
    ("Registrations Report", "Full list with payment status, date, and category"),
    ("Submissions Report", "All submissions, status, track, and decision date"),
    ("Reviews Report", "Reviewer activity, scores, completion rates"),
    ("Attendance Report", "Who checked in, when, and across which sessions"),
    ("Revenue Report", "Income by category, payment method, and timeline"),
    ("Certificate Report", "Eligibility status and download confirmations"),
    ("Sponsor / Exhibitor Report", "Sponsorship fee payment status and records"),
]
t18 = doc.add_table(rows=len(report_rows), cols=2)
t18.style = "Table Grid"
for i, (a, b) in enumerate(report_rows):
    t18.rows[i].cells[0].text = a
    t18.rows[i].cells[1].text = b
style_table(t18)
doc.add_paragraph()
body("Each report can be exported as CSV or Excel. Organization Owners and Admins also have a cross-conference overview dashboard for year-over-year trends.")
add_horizontal_rule(doc)

# ── Section 19 ──────────────────────────────────────────────────────────────
h1("19. Exporting and Importing Data")
h3("Exporting")
body("Look for the Export button on any report or list page. Available formats: CSV and Excel (.xlsx). Common exports: full registrant list, accepted abstracts, reviewer assignments, attendance data.")
h3("Importing")
body("Bulk import is available for two things:")
bullet("Bulk reviewer upload — upload a CSV of reviewer names and emails instead of adding them one by one (Reviewers → Import).")
bullet("Bulk submission import — import submissions from a previous system as a one-time migration step (Submissions → Import).")
add_callout(doc, "Data security: exported files contain personal information. Store them securely, share only with people who genuinely need them, and do not leave them unprotected on shared drives.")
add_horizontal_rule(doc)

# ── Section 20 ──────────────────────────────────────────────────────────────
h1("20. Your Account and Security")
h3("Updating Your Profile")
body("Click your name or avatar → profile. Update your full name, email address, profile photo, and ORCID. Name changes take effect everywhere immediately.")
h3("Changing Your Password")
body("Profile → Security → Change Password. Enter your current password, then the new one twice. Changing your password invalidates all other active sessions on other devices.")
h3("Privacy")
body("Operant Event stores only the personal information you provide and uses it solely to run the events you take part in. It is not sold to third parties. For the full privacy statement, contact the event organizer or your platform administrator.")
add_horizontal_rule(doc)

# ── Section 21 ──────────────────────────────────────────────────────────────
h1("21. Roles and Permissions Reference")
body("This is a complete listing of every individual capability. Most users will never need this section — it's for Organization Owners creating custom roles, or team members wanting to understand their access exactly.")

perm_rows = [
    ("Capability", "Owner", "Admin", "Conf Admin", "Track Chair"),
    ("Create a new organization", "✅", "—", "—", "—"),
    ("Edit organization settings", "✅", "✅", "—", "—"),
    ("Invite / remove team members", "✅", "✅", "—", "—"),
    ("Change a team member's role", "✅", "—", "—", "—"),
    ("Create a new conference", "✅", "✅", "—", "—"),
    ("Edit conference settings", "✅", "✅", "✅", "—"),
    ("Publish / unpublish a conference", "✅", "✅", "✅", "—"),
    ("Delete a conference", "✅", "✅", "—", "—"),
    ("Manage registration categories", "✅", "✅", "✅", "—"),
    ("View / export registrations", "✅", "✅", "✅", "—"),
    ("Confirm manual payments", "✅", "✅", "✅", "—"),
    ("Manage payment gateway settings", "✅", "✅", "—", "—"),
    ("Create and manage tracks", "✅", "✅", "—", "✅"),
    ("Build / edit submission forms", "✅", "✅", "—", "✅"),
    ("View all submissions", "✅", "✅", "—", "✅"),
    ("Assign reviewers to submissions", "✅", "✅", "—", "✅"),
    ("Record a decision on a submission", "✅", "✅", "—", "✅"),
    ("View all reviews", "✅", "✅", "—", "✅"),
    ("Manage the programme", "✅", "✅", "✅", "—"),
    ("Manage sponsors and exhibitors", "✅", "✅", "✅", "—"),
    ("Manage and perform check-in", "✅", "✅", "✅", "—"),
    ("Configure and issue certificates", "✅", "✅", "✅", "—"),
    ("View reports and dashboards", "✅", "✅", "✅", "✅"),
    ("Export reports", "✅", "✅", "✅", "✅"),
    ("Manage email templates / broadcast", "✅", "✅", "✅", "—"),
    ("Create custom roles", "✅", "—", "—", "—"),
]
t21 = doc.add_table(rows=len(perm_rows), cols=5)
t21.style = "Table Grid"
for i, row_data in enumerate(perm_rows):
    row = t21.rows[i]
    for j, val in enumerate(row_data):
        row.cells[j].text = val
        if i == 0:
            set_cell_bg(row.cells[j], "2563EB")
            for p2 in row.cells[j].paragraphs:
                for run in p2.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        elif i % 2 == 0:
            set_cell_bg(row.cells[j], "EFF6FF")
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 22 ──────────────────────────────────────────────────────────────
h1("22. What This Application Does Not Do Yet")
body("This section lists current limitations honestly so you can plan accordingly.")
limits = [
    ("Two-factor authentication (2FA)", "Not available. Accounts are protected by email and password only."),
    ("Discount codes and coupons", "Promotional pricing cannot be applied at registration."),
    ("Tax / VAT on fees", "The system does not calculate or display tax separately."),
    ("Group registrations", "Delegates must register one at a time."),
    ("Self-cancellation by delegates", "An organizer must cancel a registration on a delegate's behalf."),
    ("Badge printing", "QR codes can be printed on a ticket, but designed event badges require a separate tool."),
    ("Partial refunds", "Refunds are all-or-nothing; partial amounts require manual processing outside the platform."),
    ("Sponsor / exhibitor self-service portal", "Their information is managed entirely by the organizing team."),
    ("Audit log viewer", "Changes are stored internally but there is no screen to browse the history."),
    ("Report date-range filtering", "Reports show all-time data; filtering to a date range is not yet available."),
    ("Waitlist auto-promotion", "Waitlisted registrants must be manually moved to registered."),
    ("Co-author notifications", "Only the primary submitting author receives status-change emails."),
    ("In-app messaging", "No real-time chat within the platform."),
]
t22 = doc.add_table(rows=len(limits)+1, cols=2)
t22.style = "Table Grid"
header_cells = t22.rows[0].cells
header_cells[0].text = "Feature"
header_cells[1].text = "Current Status"
for cell in header_cells:
    set_cell_bg(cell, "2563EB")
    for p2 in cell.paragraphs:
        for run in p2.runs:
            run.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
for i, (feat, status) in enumerate(limits, 1):
    row = t22.rows[i]
    row.cells[0].text = feat
    row.cells[1].text = status
    if i % 2 == 0:
        for cell in row.cells:
            set_cell_bg(cell, "EFF6FF")
doc.add_paragraph()
add_horizontal_rule(doc)

# ── Section 23 ──────────────────────────────────────────────────────────────
h1("23. Frequently Asked Questions")
faqs = [
    ("Is Operant Event free to use?",
     "Pricing for organizations is set by your platform administrator. For delegates, authors, and reviewers, creating a personal account is free. Whether you pay to attend depends on the organizer's fees."),
    ("I can't find the conference I want to register for.",
     "Ask the organizer to share the direct link. Conferences are not in a public directory by default."),
    ("My paper shows as 'Submitted' — has anyone looked at it yet?",
     "'Submitted' means it arrived and is queued, but not yet assigned to a reviewer. Once assigned, the status changes to 'Under Review'. Contact the Track Chair if you're worried about a deadline."),
    ("Can I edit my submission after submitting?",
     "Once submitted, the paper is locked. Contact the Track Chair — they can return it to draft status for revision, though this may not be possible once review has begun."),
    ("I missed the submission deadline. Can I still submit?",
     "Deadlines are enforced automatically. Contact the Track Chair or Conference Admin directly — extending the deadline is entirely at their discretion."),
    ("I've paid but haven't received my confirmation email.",
     "Check your spam folder. Then sign in and check My Registrations — your payment status shows there even if the email didn't arrive."),
    ("My QR code doesn't scan at check-in.",
     "The desk staff can look you up by name or email search and check you in manually in about ten seconds."),
    ("I want to attend AND submit a paper. Do I need two accounts?",
     "No. One account handles everything — register as a delegate and submit your paper using the same login."),
    ("Can I review for a conference I didn't submit to?",
     "Yes. Being a reviewer is completely independent of whether you submitted a paper."),
    ("How do I transfer organization ownership to someone else?",
     "Go to Team → Members, find the new owner's profile, and promote them to Organization Owner."),
    ("Is there a mobile app?",
     "No dedicated app. Every page works well in a mobile browser (Chrome, Safari, Firefox, Edge)."),
]
for q, a in faqs:
    p = doc.add_paragraph()
    r = p.add_run("Q: " + q)
    r.bold = True
    r.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after  = Pt(1)
    a_p = doc.add_paragraph(a, style="OE Body")
    a_p.paragraph_format.space_before = Pt(0)
    a_p.paragraph_format.left_indent  = Inches(0.3)
add_horizontal_rule(doc)

# ── Section 24 — Glossary ──────────────────────────────────────────────────
h1("24. Glossary of Terms")
body("Definitions for every term used in Operant Event, in plain English.")
glossary = [
    ("Abstract", "A short summary of a paper or research work submitted to a conference track."),
    ("Assignment", "Connecting a reviewer to a specific paper they will evaluate."),
    ("Attendee", "A person who registers to attend a conference. Also: registrant, delegate."),
    ("Back-office", "The organizer-facing screens for managing a conference."),
    ("Broadcast", "A one-off email sent by an organizer to a defined group."),
    ("Camera-ready", "A final, print-ready version of an accepted paper for publication."),
    ("Capability", "One individual permission in the system. Custom roles are built from capabilities."),
    ("Certificate verification code", "A unique code on every certificate for public verification of authenticity."),
    ("Check-in", "Confirming a delegate's arrival by scanning their QR code or searching by name/email."),
    ("Conference", "A single event — academic conference, workshop, or summit — managed in Operant Event."),
    ("Conference Admin", "Organizer role for logistics: registration, payments, programme, check-in, certificates."),
    ("Conflict of interest", "A connection between a reviewer and an author that prevents impartial evaluation."),
    ("Custom role", "A role created by an Owner with a hand-picked set of individual capabilities."),
    ("Draft", "The private earliest stage of a conference before it is publicly visible."),
    ("Exhibitor", "A company with a booth at the event; tracked by the organizing team."),
    ("Export", "Downloading a list from Operant Event as CSV or Excel."),
    ("Import", "Uploading a CSV to add reviewers or submissions in bulk."),
    ("Kiosk", "The check-in screen designed for full-screen tablet or laptop use at the registration desk."),
    ("Merge field", "A placeholder in an email template (e.g. {{author_name}}) replaced with real data on send."),
    ("ORCID", "Open Researcher and Contributor ID — a unique academic identifier. Optional in Operant Event."),
    ("Organization", "The umbrella workspace that owns conferences, the team, and organization-wide settings."),
    ("Peer review", "Evaluation of submitted papers by subject-matter experts before an accept/reject decision."),
    ("Portal", "One of the six purpose-built views, each designed for a specific type of user."),
    ("Programme", "The published schedule: which sessions happen when, where, with which speakers."),
    ("QR code", "A square barcode on a delegate's ticket, scanned at check-in to confirm identity."),
    ("Registration", "The process of signing up to attend a conference, including payment if required."),
    ("Registration category", "A ticket type with its own price, capacity, and availability window."),
    ("Reviewer", "An expert invited to evaluate submitted papers and recommend a decision."),
    ("Session", "A time slot in the programme in a specific room, containing one or more session items."),
    ("Session Chair", "The person who introduces and manages a session."),
    ("Session item", "A single presentation, talk, or activity within a session."),
    ("Slug", "A short, URL-friendly version of a name used in web addresses."),
    ("Speaker", "A person presenting at a session in the programme."),
    ("Sponsor", "A company or organization financially supporting the conference."),
    ("Submission", "A paper, abstract, or proposal sent by an author to a conference track."),
    ("Track", "A thematic sub-group within a conference collecting submissions in one subject area."),
    ("Track Chair", "Academic lead for a track — manages reviewers, assigns papers, records decisions."),
    ("Waitlist", "A decision status meaning possible acceptance if space opens after main decisions."),
    ("Withdrawal", "An author's decision to remove their own submission. Cannot be undone via the platform."),
]
t24 = doc.add_table(rows=len(glossary)+1, cols=2)
t24.style = "Table Grid"
for cell in t24.rows[0].cells:
    set_cell_bg(cell, "2563EB")
    for p2 in cell.paragraphs:
        for run in p2.runs:
            run.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
t24.rows[0].cells[0].text = "Term"
t24.rows[0].cells[1].text = "Definition"
for i, (term, defn) in enumerate(glossary, 1):
    row = t24.rows[i]
    row.cells[0].text = term
    row.cells[1].text = defn
    if i % 2 == 0:
        for cell in row.cells:
            set_cell_bg(cell, "EFF6FF")
    # bold term cell
    for p2 in row.cells[0].paragraphs:
        for run in p2.runs:
            run.bold = True
doc.add_paragraph()

# ── Quick Reference ─────────────────────────────────────────────────────────
add_horizontal_rule(doc)
h1("Quick Reference: Who Does What")
qr_rows = [
    ("I am a…", "My first step", "My main section"),
    ("Conference organizer (new)", "Create an organization, then create your first conference", "Sections 5, 8"),
    ("Track Chair", "Open your conference track, add reviewers", "Sections 9, 11"),
    ("Author submitting a paper", "Sign in (or create account), click the submission link", "Section 10"),
    ("Reviewer", "Accept the invitation email, open 'My Reviews'", "Section 11"),
    ("Attendee / delegate", "Click the registration link from the organizer", "Section 12"),
    ("Check-in desk staff", "Open the Check-in screen on event day", "Section 14"),
    ("Anyone expecting a certificate", "Wait for the certificate email, download via personal link", "Section 15"),
]
tqr = doc.add_table(rows=len(qr_rows), cols=3)
tqr.style = "Table Grid"
for i, row_data in enumerate(qr_rows):
    row = tqr.rows[i]
    for j, val in enumerate(row_data):
        row.cells[j].text = val
        if i == 0:
            set_cell_bg(row.cells[j], "2563EB")
            for p2 in row.cells[j].paragraphs:
                for run in p2.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        elif i % 2 == 0:
            set_cell_bg(row.cells[j], "EFF6FF")
doc.add_paragraph()

# ── Footer note ─────────────────────────────────────────────────────────────
add_horizontal_rule(doc)
p_foot = doc.add_paragraph()
p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_foot = p_foot.add_run("Thank you for using Operant Event. We hope your conference is a great success.\nThis document was last updated: September 2026.")
r_foot.italic = True
r_foot.font.size = Pt(9)
r_foot.font.color.rgb = RGBColor(0x77, 0x77, 0x77)

# ── Save ────────────────────────────────────────────────────────────────────
doc.save(OUT_PATH)
print(f"Saved: {OUT_PATH}")
