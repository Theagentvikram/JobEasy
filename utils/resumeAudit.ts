
import { Resume, ExperienceItem, EducationItem, Project } from '../types';

export interface AuditIssue {
    id: string;
    section: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    field?: string;
}

export interface AuditResult {
    score: number;
    issues: AuditIssue[];
}

export const auditResume = (resume: Resume): AuditResult => {
    const issues: AuditIssue[] = [];
    let score = 100;

    // 1. Personal Info Checks
    if (!resume.personalInfo.email) {
        issues.push({ id: 'pi-email', section: 'Personal Info', type: 'critical', message: 'Missing Email Address', field: 'email' });
        score -= 10;
    }
    if (!resume.personalInfo.phone) {
        issues.push({ id: 'pi-phone', section: 'Personal Info', type: 'critical', message: 'Missing Phone Number', field: 'phone' });
        score -= 10;
    }
    if (!resume.personalInfo.linkedin) {
        issues.push({ id: 'pi-linkedin', section: 'Personal Info', type: 'warning', message: 'Adding a LinkedIn profile is recommended', field: 'linkedin' });
        score -= 5;
    }

    // 2. Summary Check
    if (!resume.summary || resume.summary.length < 50) {
        issues.push({ id: 'summary-len', section: 'Summary', type: 'warning', message: 'Summary is too short or missing. Aim for 2-3 sentences.', field: 'summary' });
        score -= 5;
    }

    // 3. Experience Logic Checks
    if (resume.experience.length === 0) {
        issues.push({ id: 'exp-missing', section: 'Experience', type: 'critical', message: 'No work experience listed.', field: 'experience' });
        score -= 20;
    } else {
        // Reverse Chronological Check
        // We'll simplisticly check if start dates are roughly ordered.
        // Since dates are strings, this is fuzzy. We'll skip complex date parsing for now and check simple string order if format YYYY-MM

        resume.experience.forEach((exp, idx) => {
            if (!exp.role) issues.push({ id: `exp-role-${idx}`, section: 'Experience', type: 'critical', message: `Job listed without a Title at ${exp.company || 'Unknown Company'}` });
            if (!exp.company) issues.push({ id: `exp-comp-${idx}`, section: 'Experience', type: 'critical', message: `Job listed without a Company Name` });
            if (!exp.description || exp.description.length < 20) {
                issues.push({ id: `exp-desc-${idx}`, section: 'Experience', type: 'warning', message: `Description for ${exp.role} is too short. details matter!` });
                score -= 5;
            }
        });
    }

    // 4. Education Checks
    if (resume.education.length === 0) {
        issues.push({ id: 'edu-missing', section: 'Education', type: 'warning', message: 'No education listed. (Okay if you are a senior professional, but usually expected)' });
        score -= 5;
    }

    // 5. Skills Check
    if (resume.skills.length < 5) {
        issues.push({ id: 'skills-len', section: 'Skills', type: 'warning', message: 'List at least 5 key skills.' });
        score -= 5;
    }

    // Clamp score
    return {
        score: Math.max(0, Math.min(100, score)),
        issues
    };
};
