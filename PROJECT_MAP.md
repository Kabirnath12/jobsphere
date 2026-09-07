# JobSphere Project Map

## Candidate flow

Browser → `GET /api/jobs` → Job listing

Browser → login/register → JWT → localStorage

Browser → `POST /api/applications` → authenticated candidate application

Browser → `GET /api/dashboard/candidate` → application dashboard

## Recruiter flow

Browser → recruiter login → JWT

Browser → `POST /api/jobs` → recruiter-owned job

Browser → `GET /api/dashboard/recruiter` → jobs + applications

## Data model

User
- name
- email
- passwordHash
- role
- company

Job
- title
- company
- skills
- salary
- type
- location
- description
- recruiterId
- status

Application
- jobId
- candidateId
- coverNote
- status

## Authorization

JWT payload contains user id and role. Protected routes validate the token and enforce candidate/recruiter permissions before performing actions.
