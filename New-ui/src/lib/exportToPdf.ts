import type { Resume } from '../types'

export function exportToPdf(resume: Resume) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF.')
    return
  }

  const { personalInfo: p, summary, experience, education, skills, projects } = resume

  const expHtml = experience.map((e) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <strong style="font-size:12px">${e.role}</strong>
        <span style="color:#64748b;font-size:10px">${e.startDate} — ${e.endDate}</span>
      </div>
      <div style="color:#475569;font-size:11px">${e.company}</div>
      ${e.description ? `<div style="margin-top:4px;color:#334155;font-size:10px;white-space:pre-wrap">${e.description}</div>` : ''}
    </div>`).join('')

  const eduHtml = education.map((e) => `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <div><strong style="font-size:12px">${e.degree}</strong><span style="color:#475569"> · ${e.school}</span></div>
      <span style="color:#64748b;font-size:10px">${e.year}</span>
    </div>`).join('')

  const projHtml = projects.map((proj) => `
    <div style="margin-bottom:8px">
      <strong style="font-size:12px">${proj.name}</strong>
      ${proj.link ? `<span style="color:#0369a1;font-size:10px"> · ${proj.link}</span>` : ''}
      ${proj.description ? `<div style="color:#334155;font-size:10px;margin-top:2px">${proj.description}</div>` : ''}
    </div>`).join('')

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${resume.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Plus Jakarta Sans',sans-serif;
      font-size:11px;
      line-height:1.6;
      color:#1e293b;
      padding:28mm 22mm;
    }
    h2{
      font-size:8.5px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.1em;
      color:#0369a1;
      margin-bottom:5px;
      margin-top:14px;
    }
    p{margin:0}
    @media screen{body{max-width:800px;margin:auto;padding:32px}}
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #0369a1;padding-bottom:10px;margin-bottom:14px">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a">${p.fullName || 'Resume'}</h1>
    ${p.title ? `<div style="font-size:12px;color:#475569;margin-top:3px">${p.title}</div>` : ''}
    <div style="font-size:10px;color:#64748b;margin-top:5px">${[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join('  ·  ')}</div>
  </div>
  ${summary ? `<h2>Professional Summary</h2><p style="color:#334155;font-size:11px;margin-top:4px">${summary}</p>` : ''}
  ${experience.length ? `<h2>Experience</h2>${expHtml}` : ''}
  ${education.length ? `<h2>Education</h2>${eduHtml}` : ''}
  ${skills.length ? `<h2>Skills</h2><p style="color:#334155;margin-top:4px">${skills.join(' · ')}</p>` : ''}
  ${projects.length ? `<h2>Projects</h2>${projHtml}` : ''}
  <script>
    document.fonts.ready.then(function(){window.print();setTimeout(function(){window.close()},800)})
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}
