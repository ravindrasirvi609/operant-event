"""
Generate professional diagrams for the Operant Event user guide.
Run: python docs/user-guide/generate_diagrams.py
Outputs: docs/user-guide/images/*.png
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np

OUT = os.path.join(os.path.dirname(__file__), 'images')
os.makedirs(OUT, exist_ok=True)

# ── Palette ─────────────────────────────────────────────────────────────────
C_BLUE       = '#2563EB'   # organizer / system
C_BLUE_L     = '#EFF6FF'
C_GREEN      = '#059669'   # confirmed / success
C_GREEN_L    = '#ECFDF5'
C_AMBER      = '#D97706'   # pending / attention
C_AMBER_L    = '#FFFBEB'
C_RED        = '#DC2626'   # rejected / error
C_RED_L      = '#FEF2F2'
C_PURPLE     = '#7C3AED'   # reviewer
C_PURPLE_L   = '#F5F3FF'
C_TEAL       = '#0891B2'   # participant
C_TEAL_L     = '#ECFEFF'
C_GRAY       = '#374151'   # neutral dark
C_GRAY_L     = '#F9FAFB'
C_GRAY_MID   = '#9CA3AF'   # arrows / borders

ARROW_STYLE = dict(arrowstyle='-|>', color=C_GRAY_MID,
                   linewidth=1.4, mutation_scale=14)


def box(ax, x, y, w, h, text, fc, ec, tc='#1F2937', fontsize=9, bold=False,
        subtext=None, subfontsize=7.5):
    """Draw a rounded rectangle with centred label (and optional subtitle)."""
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle='round,pad=0.0,rounding_size=0.18',
                          fc=fc, ec=ec, lw=1.5, zorder=2)
    ax.add_patch(rect)
    ty = y + (0.14 if subtext else 0)
    ax.text(x, ty, text, ha='center', va='center', fontsize=fontsize,
            color=tc, fontweight='bold' if bold else 'normal',
            zorder=3, linespacing=1.3)
    if subtext:
        ax.text(x, y - 0.22, subtext, ha='center', va='center',
                fontsize=subfontsize, color='#6B7280', zorder=3,
                style='italic')


def arrow(ax, x0, y0, x1, y1, label='', rad=0.0, lw=1.4):
    """Draw a curved arrow with optional midpoint label."""
    ax.annotate('', xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(arrowstyle='-|>', color=C_GRAY_MID,
                                lw=lw, mutation_scale=14,
                                connectionstyle=f'arc3,rad={rad}'))
    if label:
        mx, my = (x0+x1)/2, (y0+y1)/2
        ax.text(mx, my + 0.12, label, ha='center', va='bottom',
                fontsize=7, color='#6B7280', style='italic')


def save(fig, name, dpi=150):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=dpi, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f'  Saved: {path}')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 1 – Who Uses Operant Event (role map)
# ────────────────────────────────────────────────────────────────────────────
def d1_roles():
    fig, ax = plt.subplots(figsize=(14, 7))
    ax.set_xlim(0, 14); ax.set_ylim(0, 7)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7, 6.6, 'Who Uses Operant Event', ha='center', va='center',
            fontsize=15, fontweight='bold', color=C_GRAY)

    # Central platform hub
    hub_x, hub_y = 7, 3.6
    circ = plt.Circle((hub_x, hub_y), 1.0, fc=C_BLUE, ec=C_BLUE, zorder=2)
    ax.add_patch(circ)
    ax.text(hub_x, hub_y + 0.18, 'Operant Event', ha='center', va='center',
            fontsize=10, fontweight='bold', color='white', zorder=3)
    ax.text(hub_x, hub_y - 0.22, 'Platform', ha='center', va='center',
            fontsize=8.5, color='#BFDBFE', zorder=3)

    # Organising team (left side)
    roles_left = [
        (2.2, 6.0, 'Organization Owner', 'Full control', C_BLUE, C_BLUE_L),
        (2.2, 4.6, 'Organization Admin', 'Manage everything\nexcept roles', C_BLUE, C_BLUE_L),
        (2.2, 3.2, 'Conference Admin', 'Day-to-day operations', C_BLUE, C_BLUE_L),
        (2.2, 1.8, 'Track Chair', 'Scientific oversight\n& decisions', C_PURPLE, C_PURPLE_L),
    ]
    ax.text(1.2, 6.6, 'YOUR ORGANIZING TEAM', ha='center', fontsize=8,
            color=C_BLUE, fontweight='bold')

    for rx, ry, title, sub, ec, fc in roles_left:
        box(ax, rx, ry, 3.0, 0.85, title, fc, ec, fontsize=8.5, bold=True,
            subtext=sub, subfontsize=7)
        arrow(ax, rx + 1.5, ry, hub_x - 1.0, hub_y + (ry - hub_y) * 0.5, rad=0.1)

    # Event participants (right side)
    roles_right = [
        (11.8, 6.0, 'Paper Author', 'Submits abstracts', C_TEAL, C_TEAL_L),
        (11.8, 4.7, 'Reviewer', 'Evaluates submissions', C_PURPLE, C_PURPLE_L),
        (11.8, 3.4, 'Attendee / Registrant', 'Registers & pays', C_GREEN, C_GREEN_L),
        (11.8, 2.1, 'Speaker / Chair', 'Presents sessions', C_AMBER, C_AMBER_L),
        (11.8, 0.85, 'Check-in Staff', 'Scans QR codes\non event day', C_GREEN, C_GREEN_L),
    ]
    ax.text(12.6, 6.6, 'EVENT PARTICIPANTS', ha='center', fontsize=8,
            color=C_TEAL, fontweight='bold')

    for rx, ry, title, sub, ec, fc in roles_right:
        box(ax, rx, ry, 3.1, 0.82, title, fc, ec, fontsize=8.5, bold=True,
            subtext=sub, subfontsize=7)
        arrow(ax, rx - 1.55, ry, hub_x + 1.0, hub_y + (ry - hub_y) * 0.5, rad=-0.1)

    save(fig, 'diagram1_roles.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 2 – Conference Lifecycle
# ────────────────────────────────────────────────────────────────────────────
def d2_lifecycle():
    fig, ax = plt.subplots(figsize=(16, 5))
    ax.set_xlim(0, 16); ax.set_ylim(0, 5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(8, 4.65, 'Conference Lifecycle — Seven Stages', ha='center',
            fontsize=14, fontweight='bold', color=C_GRAY)

    stages = [
        (1.05, 'DRAFT',        'Private setup.\nNot visible yet.',          C_GRAY,   C_GRAY_L),
        (3.35, 'OPEN',         'Call for papers live.\nSubmissions open.',   C_BLUE,   C_BLUE_L),
        (5.65, 'REVIEW',       'Submissions under\npeer review.',            C_PURPLE, C_PURPLE_L),
        (7.95, 'REGISTRATION', 'Delegates register\nand pay.',              C_TEAL,   C_TEAL_L),
        (10.25,'ONGOING',      'Event is running.\nCheck-in active.',        C_GREEN,  C_GREEN_L),
        (12.55,'COMPLETED',    'Event over. Certificates\n& reporting.',     C_AMBER,  C_AMBER_L),
        (14.85,'ARCHIVED',     'Read-only.\nFinal record.',                  C_GRAY,   C_GRAY_L),
    ]

    bw, bh = 1.98, 1.75
    for i, (x, label, desc, ec, fc) in enumerate(stages):
        box(ax, x, 2.5, bw, bh, label, fc, ec, fontsize=9.5, bold=True,
            subtext=desc, subfontsize=8)
        if i < len(stages) - 1:
            arrow(ax, x + bw/2, 2.5, stages[i+1][0] - bw/2, 2.5)

    ax.text(8, 0.35, 'Each stage is one-way: you can only move forward (except DRAFT, which can also go directly to ARCHIVED).',
            ha='center', fontsize=8, color='#6B7280', style='italic')

    save(fig, 'diagram2_lifecycle.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 3 – Abstract Submission & Review Journey
# ────────────────────────────────────────────────────────────────────────────
def d3_abstract():
    fig, ax = plt.subplots(figsize=(13, 9.5))
    ax.set_xlim(0, 13); ax.set_ylim(0, 9.5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(6.5, 9.15, 'Abstract Submission & Review Journey', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 2.6, 0.75

    def bx(x, y, lbl, fc, ec, fs=8.5, bold=True, sub=None):
        box(ax, x, y, W, H, lbl, fc, ec, fontsize=fs, bold=bold,
            subtext=sub, subfontsize=7)

    # Column positions
    L = 2.0   # left / author column
    C_ = 6.5  # centre / review
    R = 11.0  # right / decisions

    # Step 1 – author
    bx(L, 8.3, 'Author Saves Draft',         C_BLUE_L, C_BLUE, fs=8.5)
    bx(L, 7.1, 'Author Submits Abstract',    C_BLUE_L, C_BLUE, fs=8.5,
       sub='Deadline checked · confirmation email sent')
    # Step 2 – organiser
    bx(C_, 5.8, 'Organiser Screens & Assigns\nto Reviewers',
       C_PURPLE_L, C_PURPLE, fs=8)
    # Step 3 – reviewers
    bx(C_, 4.5, 'Reviewers Score (1–5) &\nSubmit Recommendation',
       C_PURPLE_L, C_PURPLE, fs=8)
    # Step 4 – decision
    bx(C_, 3.1, 'Organiser Records\nFinal Decision', C_AMBER_L, C_AMBER, fs=8)

    # Decision outcomes
    bx(1.6,  1.5, 'ACCEPTED',          C_GREEN_L, C_GREEN,  fs=9, bold=True)
    bx(4.5,  1.5, 'REVISION REQUIRED', C_AMBER_L, C_AMBER,  fs=8, bold=True)
    bx(7.4,  1.5, 'WAITLISTED',        C_BLUE_L,  C_BLUE,   fs=9, bold=True)
    bx(10.3, 1.5, 'REJECTED',          C_RED_L,   C_RED,    fs=9, bold=True)

    # Author revision loop
    bx(4.5, 0.5, 'Author Revises & Resubmits',
       C_AMBER_L, C_AMBER, fs=7.5)

    # Scheduled / Presented
    bx(1.6, 0.5, 'Scheduled → Presented', C_GREEN_L, C_GREEN, fs=8)

    # Arrows
    arrow(ax, L, 8.3 - H/2, L, 7.1 + H/2)                        # draft -> submit
    arrow(ax, L + W/2, 7.1, C_ - W/2, 5.8, rad=0.0)               # submit -> screen
    arrow(ax, C_, 5.8 - H/2, C_, 4.5 + H/2)                       # screen -> review
    arrow(ax, C_, 4.5 - H/2, C_, 3.1 + H/2)                       # review -> decision

    # Decision -> outcomes
    arrow(ax, C_ - W/2, 3.1, 1.6 + W/2, 1.5 + H/2, rad=0.05)
    arrow(ax, C_ - 0.6, 3.1 - H/2, 4.5, 1.5 + H/2, rad=0.0)
    arrow(ax, C_ + 0.4, 3.1 - H/2, 7.4, 1.5 + H/2, rad=0.0)
    arrow(ax, C_ + W/2, 3.1, 10.3 - W/2, 1.5 + H/2, rad=-0.05)

    # Revision loop back
    arrow(ax, 4.5, 1.5 - H/2, 4.5, 0.5 + H/2)
    ax.annotate('', xy=(L, 7.1 - H/2 + 0.12),
                xytext=(4.5 - W/2, 0.5),
                arrowprops=dict(arrowstyle='-|>', color=C_AMBER, lw=1.4,
                                mutation_scale=12,
                                connectionstyle='arc3,rad=-0.45'))
    ax.text(0.8, 3.3, 'Loop:\nrevise &\nresubmit', ha='center', fontsize=7,
            color=C_AMBER, style='italic')

    # Accepted -> scheduled
    arrow(ax, 1.6, 1.5 - H/2, 1.6, 0.5 + H/2)

    # Withdraw note
    ax.annotate('', xy=(10.3, 5.5),
                xytext=(10.3, 7.1),
                arrowprops=dict(arrowstyle='-|>', color='#9CA3AF', lw=1.2,
                                mutation_scale=10,
                                connectionstyle='arc3,rad=0.0'))
    box(ax, 10.3, 6.3, 2.0, 0.65, 'WITHDRAWN\n(any time before\ndecision)',
        '#F9FAFB', '#9CA3AF', fontsize=7, bold=False)

    ax.text(6.5, 0.08, 'WITHDRAWN = author cancels their submission before a final decision is recorded.',
            ha='center', fontsize=7.5, color='#9CA3AF', style='italic')

    save(fig, 'diagram3_abstract.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 4 – Registration & Payment Flow
# ────────────────────────────────────────────────────────────────────────────
def d4_registration():
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.set_xlim(0, 14); ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7, 7.65, 'Registration & Payment Flow', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 3.0, 0.75

    def bx(x, y, lbl, fc, ec, fs=8.5, bold=True, sub=None):
        box(ax, x, y, W, H, lbl, fc, ec, fontsize=fs, bold=bold,
            subtext=sub, subfontsize=7.2)

    # Main spine
    bx(7, 6.8, 'Attendee Picks Registration Category',
       C_TEAL_L, C_TEAL, sub='Price & availability set by organiser')
    bx(7, 5.8, 'Registration Created (PENDING)',
       C_AMBER_L, C_AMBER, sub='Sequential registration number assigned')
    bx(7, 4.8, 'Attendee Proceeds to Checkout',
       C_TEAL_L, C_TEAL, sub='Order created — price locked in')

    arrow(ax, 7, 6.8-H/2, 7, 5.8+H/2)
    arrow(ax, 7, 5.8-H/2, 7, 4.8+H/2)

    # Two payment branches
    bx(3.5, 3.6, 'Online Gateway\n(Razorpay / Stripe)',
       C_BLUE_L, C_BLUE, fs=8.5, sub='Redirected to secure payment page')
    bx(10.5, 3.6, 'Manual / Offline Payment',
       C_AMBER_L, C_AMBER, fs=8.5, sub='Bank transfer, cheque, cash')

    arrow(ax, 7 - W/2, 4.8, 3.5 + W/2, 3.6 + H/2, rad=0.1)
    arrow(ax, 7 + W/2, 4.8, 10.5 - W/2, 3.6 + H/2, rad=-0.1)

    bx(3.5, 2.5, 'Verified by Payment\nWebhook (automatic)',
       C_BLUE_L, C_BLUE, fs=8, sub='Tamper-proof confirmation')
    bx(10.5, 2.5, 'Attendee Submits\nPayment Proof',
       C_AMBER_L, C_AMBER, fs=8, sub='Reference + optional receipt image')
    bx(10.5, 1.5, 'Staff Reviews & Approves\nManual Payment',
       C_AMBER_L, C_AMBER, fs=8, sub='Audited action — records who approved')

    arrow(ax, 3.5, 3.6-H/2, 3.5, 2.5+H/2)
    arrow(ax, 10.5, 3.6-H/2, 10.5, 2.5+H/2)
    arrow(ax, 10.5, 2.5-H/2, 10.5, 1.5+H/2)

    # Converge
    bx(7, 0.75, 'Order PAID — Registration CONFIRMED',
       C_GREEN_L, C_GREEN, fs=9, bold=True,
       sub='QR code issued · invoice generated · confirmation email sent')

    arrow(ax, 3.5 + W/2, 2.5, 7 - W/2, 0.75 + H/2, rad=-0.1)
    arrow(ax, 10.5 - W/2, 1.5, 7 + W/2, 0.75 + H/2, rad=0.1)

    # Divider label
    ax.plot([6.9, 7.1], [4.4, 4.4], color=C_GRAY_MID, lw=0.8)
    ax.text(7, 4.35, 'Two payment paths — both lead to the same outcome',
            ha='center', fontsize=7, color='#9CA3AF', style='italic')

    save(fig, 'diagram4_registration.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 5 – Event Day Check-in
# ────────────────────────────────────────────────────────────────────────────
def d5_checkin():
    fig, ax = plt.subplots(figsize=(12, 6.5))
    ax.set_xlim(0, 12); ax.set_ylim(0, 6.5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(6, 6.15, 'Event Day Check-in', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 2.8, 0.7

    def bx(x, y, lbl, fc, ec, fs=8.5, bold=True, sub=None):
        box(ax, x, y, W, H, lbl, fc, ec, fontsize=fs, bold=bold,
            subtext=sub, subfontsize=7)

    bx(6, 5.5, 'Staff Opens Check-in Kiosk',
       C_GREEN_L, C_GREEN, sub='Full-screen, big-touch-target interface')
    bx(6, 4.6, 'Select Check-in Type',
       C_GREEN_L, C_GREEN, sub='Main Event · Workshop · Session · Banquet')

    # Three input methods
    bx(2.0, 3.5, 'Scan QR Code\n(camera)',     C_TEAL_L, C_TEAL, fs=8)
    bx(6.0, 3.5, 'Type Registration\nNumber',  C_TEAL_L, C_TEAL, fs=8)
    bx(10.0,3.5, 'Type Delegate\nEmail',       C_TEAL_L, C_TEAL, fs=8)

    arrow(ax, 6, 5.5-H/2, 6, 4.6+H/2)
    arrow(ax, 6 - W/2, 4.6, 2.0 + W/2, 3.5 + H/2, rad=0.1)
    arrow(ax, 6, 4.6-H/2, 6, 3.5+H/2)
    arrow(ax, 6 + W/2, 4.6, 10.0 - W/2, 3.5 + H/2, rad=-0.1)

    # Converge to check
    bx(6, 2.5, 'System Looks Up Registration',
       C_BLUE_L, C_BLUE, sub='Checks: registration must be CONFIRMED')
    arrow(ax, 2.0, 3.5-H/2, 6-W/2, 2.5+H/2, rad=-0.1)
    arrow(ax, 6, 3.5-H/2, 6, 2.5+H/2)
    arrow(ax, 10, 3.5-H/2, 6+W/2, 2.5+H/2, rad=0.1)

    # Decision branches
    bx(3.5, 1.4, '✓  Check-in Recorded\n+ Attendance Logged',
       C_GREEN_L, C_GREEN, fs=8.5, bold=True)
    bx(9.0, 1.4, '✗  Error Shown\n(status displayed)',
       C_RED_L, C_RED, fs=8.5, bold=True)

    arrow(ax, 6-W/2, 2.5, 3.5+W/2, 1.4+H/2, rad=0.05)
    arrow(ax, 6+W/2, 2.5, 9.0-W/2, 1.4+H/2, rad=-0.05)

    ax.text(3.5, 2.45, 'Confirmed', ha='center', fontsize=7.5,
            color=C_GREEN, fontweight='bold')
    ax.text(8.2, 2.45, 'Not confirmed', ha='center', fontsize=7.5,
            color=C_RED, fontweight='bold')

    # Loop back
    ax.annotate('', xy=(6+W/2+0.05, 5.5),
                xytext=(3.5+W/2, 1.4-H/2),
                arrowprops=dict(arrowstyle='-|>', color='#9CA3AF', lw=1.2,
                                mutation_scale=10,
                                connectionstyle='arc3,rad=0.45'))
    ax.text(11.4, 3.4, 'Ready for\nnext scan', ha='center', fontsize=7.5,
            color='#9CA3AF', style='italic')

    bx(6, 0.5, '"Allow Re-entry" toggle: off = prevent duplicates · on = every scan recorded',
       C_GRAY_L, C_GRAY_MID, fs=7.5, bold=False, sub=None)

    save(fig, 'diagram5_checkin.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 6 – Certificate Journey
# ────────────────────────────────────────────────────────────────────────────
def d6_certificates():
    fig, ax = plt.subplots(figsize=(14, 5.5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5.5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7, 5.15, 'Certificate Journey — From Eligibility to Verification', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    steps = [
        (1.3,  'Event\nCompleted',          C_AMBER_L,  C_AMBER),
        (3.4,  'Organiser Runs\nEligibility Check',  C_BLUE_L,   C_BLUE),
        (5.5,  'Certificates\nCreated (ELIGIBLE)',   C_GREEN_L,  C_GREEN),
        (7.6,  'Organiser Issues\nCertificates',     C_GREEN_L,  C_GREEN),
        (9.7,  'PDF Generated +\nVerification Code', C_TEAL_L,   C_TEAL),
        (11.8, 'Holder Downloads\nCertificate',      C_TEAL_L,   C_TEAL),
        (13.5, 'Anyone Verifies\nOnline (public)',   C_PURPLE_L, C_PURPLE),
    ]

    W, H = 1.85, 1.25
    for i, (x, lbl, fc, ec) in enumerate(steps):
        box(ax, x, 3.0, W, H, lbl, fc, ec, fontsize=8.5, bold=(i == 3))
        if i < len(steps) - 1:
            arrow(ax, x + W/2, 3.0, steps[i+1][0] - W/2, 3.0)

    # 6 cert types listed below
    types = [
        (1.3,  'Participation'),
        (3.3,  'Presentation'),
        (5.3,  'Speaker'),
        (7.3,  'Reviewer'),
        (9.3,  'Chair'),
        (11.3, 'Workshop'),
    ]
    ax.text(6.3, 1.65, 'Six certificate types, each with its own eligibility rule:', ha='center',
            fontsize=8.5, color=C_GRAY, fontweight='bold')
    for tx, tname in types:
        ax.text(tx, 1.2, tname, ha='center', fontsize=8, color=C_BLUE,
                bbox=dict(fc=C_BLUE_L, ec=C_BLUE, boxstyle='round,pad=0.2', lw=1))

    ax.text(7, 0.5,
            'Anyone can enter a certificate\'s verification code at the public /verify page to confirm it is genuine.',
            ha='center', fontsize=8, color='#6B7280', style='italic')

    save(fig, 'diagram6_certificates.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 7 – Portals (where each person logs in)
# ────────────────────────────────────────────────────────────────────────────
def d7_portals():
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.set_xlim(0, 14); ax.set_ylim(0, 5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7, 4.65, 'Where Does Each Person Go?  —  Six Portals', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    portals = [
        (1.4,  'Organiser\nBack-Office',    'Set up &\nmanage events',   C_BLUE_L,   C_BLUE),
        (3.7,  'Author\nPortal',            'Submit & track\npapers',    C_TEAL_L,   C_TEAL),
        (6.0,  'Reviewer\nPortal',          'Score assigned\nabstracts', C_PURPLE_L, C_PURPLE),
        (8.3,  'Participant\nPortal',        'Register,\npay & download', C_GREEN_L,  C_GREEN),
        (10.6, 'Check-in\nKiosk',           'Scan QR on\nevent day',     C_AMBER_L,  C_AMBER),
        (12.9, 'Public\nPages',             'Programme,\ncertificate verify', C_GRAY_L, C_GRAY),
    ]

    for px, title, desc, fc, ec in portals:
        box(ax, px, 2.7, 2.1, 1.9, title, fc, ec, fontsize=10, bold=True,
            subtext=desc, subfontsize=8.5)

    # Login required label
    ax.text(7.5, 0.8, '🔐 Login required for all portals except Public Pages', ha='center',
            fontsize=8.5, color='#6B7280')
    ax.text(7.5, 0.4,
            'No organisation membership needed to submit a paper, register for an event, or review an abstract.',
            ha='center', fontsize=8, color='#9CA3AF', style='italic')

    save(fig, 'diagram7_portals.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 8 – Platform Governance: Creating & Suspending Organizations
# ────────────────────────────────────────────────────────────────────────────
def d8_platform_governance():
    fig, ax = plt.subplots(figsize=(14.5, 10.5))
    ax.set_xlim(0, 14.5); ax.set_ylim(0, 10.5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7.25, 10.15, 'Platform Governance — Only the Super Admin Does This', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 2.6, 0.8

    def bx(x, y, lbl, fc, ec, fs=8.3, bold=True, sub=None, w=W, h=H):
        box(ax, x, y, w, h, lbl, fc, ec, fontsize=fs, bold=bold, subtext=sub, subfontsize=7)

    # ── Lane label ──
    ax.text(0.95, 8.3, 'CREATING AN\nORGANIZATION', ha='center', fontsize=8.5,
            color=C_BLUE, fontweight='bold')

    # Top lane: creation flow
    bx(2.6, 8.0, 'Super Admin Enters Org\n+ Owner Email/Name', C_BLUE_L, C_BLUE)
    bx(6.0, 8.0, 'System Checks:\nDoes Owner Have an Account?', C_AMBER_L, C_AMBER, w=3.0)

    arrow(ax, 2.6 + W/2, 8.0, 6.0 - 1.5, 8.0)

    bx(9.6, 8.9, 'YES — Existing User\nAdded as Owner (ACTIVE)', C_GREEN_L, C_GREEN, fs=8)
    bx(9.6, 7.1, 'NO — New Account Created\n(INVITED) + Set-Password Email Sent',
       C_TEAL_L, C_TEAL, fs=8, w=3.0)

    arrow(ax, 6.0 + 1.5, 8.0, 9.6 - W/2, 8.9, rad=0.12)
    arrow(ax, 6.0 + 1.5, 8.0, 9.6 - 1.5, 7.1, rad=-0.12)

    bx(12.8, 7.1, 'Owner Clicks Link,\nSets Password', C_TEAL_L, C_TEAL, fs=7.8)
    arrow(ax, 9.6 + 1.5, 7.1, 12.8 - W/2, 7.1)

    bx(7, 5.9, 'Organization Owner Is Active — Manages the New Workspace',
       C_GREEN_L, C_GREEN, fs=9, bold=True, w=6.4, h=0.75)
    arrow(ax, 9.6, 8.9 - H/2, 7 + 1.0, 5.9 + H/2 + 0.05, rad=0.08)
    arrow(ax, 12.8, 7.1 - H/2, 7 + 2.4, 5.9 + H/2 - 0.05, rad=0.1)

    # Divider — sits in the gap between the top lane's lowest box (converge,
    # bottom edge 5.525) and the bottom lane's highest box (SUSPEND, top edge 5.4).
    ax.plot([0.3, 14.2], [5.46, 5.46], color=C_GRAY_MID, lw=0.8, linestyle='--')

    # Bottom lane: suspend/activate flow
    # va='top' anchors the TOP of the text block (not the first line's
    # baseline), so it's a predictable distance below the divider regardless
    # of exact font-metric quirks.
    ax.text(0.95, 4.75, 'ACTIVATING OR\nSUSPENDING AN ORG', ha='center', va='top',
            fontsize=8.5, color=C_RED, fontweight='bold')

    bx(2.6, 4.15, 'Super Admin Opens\n"All Organizations"', C_BLUE_L, C_BLUE)
    bx(6.0, 4.15, 'Picks an Organization,\nClicks Suspend or Activate', C_AMBER_L, C_AMBER, w=3.0)
    arrow(ax, 2.6 + W/2, 4.15, 6.0 - 1.5, 4.15)

    bx(9.8, 5.0, 'SUSPEND\nConfirmation Required', C_RED_L, C_RED, fs=8.3, w=2.8)
    bx(9.8, 3.3, 'ACTIVATE\nTakes Effect Immediately', C_GREEN_L, C_GREEN, fs=8.3, w=2.8)
    arrow(ax, 6.0 + 1.5, 4.15, 9.8 - 1.4, 5.0, rad=0.1)
    arrow(ax, 6.0 + 1.5, 4.15, 9.8 - 1.4, 3.3, rad=-0.1)

    bx(2.3, 1.9, 'Every Member Instantly\nLoses Access — All Conferences,\nData & Settings Blocked',
       C_RED_L, C_RED, fs=7.8, w=3.4, h=1.0)
    bx(6.0, 1.9, 'Members Regain Access\nExactly as It Was Before',
       C_GREEN_L, C_GREEN, fs=7.8, w=3.0, h=1.0)
    arrow(ax, 9.8 - 1.4, 5.0, 2.3 + 1.7, 1.9 + 0.5, rad=0.25)
    arrow(ax, 9.8 - 1.4, 3.3, 6.0 + 1.5, 1.9 + 0.3, rad=0.08)

    ax.text(7.25, 0.45,
            'Enforced centrally for every request — not something an Organization Owner can override from inside their own org.',
            ha='center', fontsize=8, color='#6B7280', style='italic')

    save(fig, 'diagram8_platform_governance.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 9 – Three Ways to Get an Operant Event Account
# ────────────────────────────────────────────────────────────────────────────
def d9_account_paths():
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.set_xlim(0, 14); ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(7, 7.65, 'Three Ways to Get an Operant Event Account', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 3.3, 0.85

    def bx(x, y, lbl, fc, ec, fs=8.2, bold=True, sub=None, w=W):
        box(ax, x, y, w, H, lbl, fc, ec, fontsize=fs, bold=bold, subtext=sub, subfontsize=7)

    cols = [2.3, 7.0, 11.7]
    headers = [
        ('Self-Registration', 'Authors · Reviewers ·\nAttendees · Speakers', C_TEAL),
        ('Super Admin Provisions\nan Organization', 'First Owner of a\nnew workspace', C_BLUE),
        ('Team Invitation', 'Added by an existing\nOrganization Owner/Admin', C_PURPLE),
    ]
    for x, (title, sub, color) in zip(cols, headers):
        ax.text(x, 6.95, title, ha='center', fontsize=9.5, fontweight='bold', color=color)
        ax.text(x, 6.55, sub, ha='center', fontsize=7.5, color='#6B7280', style='italic')

    # Column A — self-registration
    bx(cols[0], 5.6, 'Visits Public\nSign-Up Page', C_TEAL_L, C_TEAL)
    bx(cols[0], 4.4, 'Enters Name,\nEmail & Password', C_TEAL_L, C_TEAL)
    bx(cols[0], 3.2, 'Account Is ACTIVE\nImmediately', C_GREEN_L, C_GREEN)
    arrow(ax, cols[0], 5.6-H/2, cols[0], 4.4+H/2)
    arrow(ax, cols[0], 4.4-H/2, cols[0], 3.2+H/2)

    # Column B — super admin creates org
    bx(cols[1], 5.6, 'Super Admin Enters\nOwner Email + Name', C_BLUE_L, C_BLUE)
    bx(cols[1], 4.4, 'Account Created\n(INVITED) + Email Sent', C_AMBER_L, C_AMBER)
    bx(cols[1], 3.2, 'Clicks Link,\nSets Password → ACTIVE', C_GREEN_L, C_GREEN)
    arrow(ax, cols[1], 5.6-H/2, cols[1], 4.4+H/2)
    arrow(ax, cols[1], 4.4-H/2, cols[1], 3.2+H/2)

    # Column C — team invite
    bx(cols[2], 5.6, 'Owner/Admin Invites\nby Email + Role', C_PURPLE_L, C_PURPLE)
    bx(cols[2], 4.4, 'Account Created\n(INVITED) + Email Sent', C_AMBER_L, C_AMBER)
    bx(cols[2], 3.2, 'Clicks Link,\nSets Password → ACTIVE', C_GREEN_L, C_GREEN)
    arrow(ax, cols[2], 5.6-H/2, cols[2], 4.4+H/2)
    arrow(ax, cols[2], 4.4-H/2, cols[2], 3.2+H/2)

    # Converge
    bx(7, 1.5, 'One Operant Event Account — Many Hats',
       C_GRAY_L, C_GRAY, fs=10, bold=True, w=5.0)
    for x in cols:
        arrow(ax, x, 3.2-H/2, 7 + (x-7)*0.3, 1.5+H/2, rad=0.0)

    ax.text(7, 0.55,
            'The same login can be an Organization Owner here, a Reviewer there, and an Attendee somewhere else — all at once.',
            ha='center', fontsize=8, color='#6B7280', style='italic')

    save(fig, 'diagram9_account_paths.png')


# ────────────────────────────────────────────────────────────────────────────
# Diagram 10 – Team Invitation & Role Assignment Flow
# ────────────────────────────────────────────────────────────────────────────
def d10_team_invite():
    fig, ax = plt.subplots(figsize=(13, 7))
    ax.set_xlim(0, 13); ax.set_ylim(0, 7)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    ax.text(6.5, 6.65, 'Inviting a Team Member & Assigning Their Role', ha='center',
            fontsize=13, fontweight='bold', color=C_GRAY)

    W, H = 2.9, 0.8

    def bx(x, y, lbl, fc, ec, fs=8.3, bold=True, sub=None, w=W, h=H):
        box(ax, x, y, w, h, lbl, fc, ec, fontsize=fs, bold=bold, subtext=sub, subfontsize=7)

    bx(1.8, 5.5, 'Owner/Admin Opens\nTeam → Members', C_BLUE_L, C_BLUE)
    bx(5.0, 5.5, 'Enters Email, Name\n& Chooses a Role', C_BLUE_L, C_BLUE)
    bx(8.2, 5.5, 'System Checks:\nDoes This Email Exist?', C_AMBER_L, C_AMBER, w=3.0)

    arrow(ax, 1.8+W/2, 5.5, 5.0-W/2, 5.5)
    arrow(ax, 5.0+W/2, 5.5, 8.2-1.5, 5.5)

    bx(11.5, 6.3, 'YES — Membership Added\nto Existing Account', C_GREEN_L, C_GREEN, fs=7.8)
    bx(11.5, 4.6, 'NO — New Account (INVITED)\n+ Set-Password Email Sent', C_TEAL_L, C_TEAL, fs=7.8, w=3.0)
    arrow(ax, 8.2+1.5, 5.5, 11.5-W/2, 6.3, rad=0.1)
    arrow(ax, 8.2+1.5, 5.5, 11.5-1.5, 4.6, rad=-0.1)

    bx(11.5, 3.0, 'Invitee Clicks Link,\nSets Their Password', C_TEAL_L, C_TEAL, fs=7.8)
    arrow(ax, 11.5, 4.6-H/2, 11.5, 3.0+H/2)

    bx(6.5, 1.7, 'Membership Becomes ACTIVE — Appears in Team List With Assigned Role',
       C_GREEN_L, C_GREEN, fs=9, bold=True, w=7.5, h=0.75)
    arrow(ax, 11.5, 6.3-H/2, 6.5+2.3, 1.7+0.5, rad=0.15)
    arrow(ax, 11.5, 3.0-H/2, 6.5+2.3, 1.7+0.1, rad=0.0)

    ax.text(6.5, 0.6,
            'Changing someone\'s role later works the same way — open their profile in Team → Members and pick a different role.',
            ha='center', fontsize=8, color='#6B7280', style='italic')

    save(fig, 'diagram10_team_invite.png')


# ── Run all ─────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('Generating Operant Event user-guide diagrams...')
    d1_roles()
    d2_lifecycle()
    d3_abstract()
    d4_registration()
    d5_checkin()
    d6_certificates()
    d7_portals()
    d8_platform_governance()
    d9_account_paths()
    d10_team_invite()
    print('All diagrams generated.')
