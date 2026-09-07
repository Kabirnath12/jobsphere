import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ["candidate", "recruiter"] },
  company: String,
  createdAt: { type: Date, default: Date.now }
});

const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  skills: [String],
  salary: String,
  type: String,
  location: String,
  description: String,
  recruiterId: mongoose.Schema.Types.ObjectId,
  status: { type: String, default: "open" },
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  jobId: mongoose.Schema.Types.ObjectId,
  candidateId: mongoose.Schema.Types.ObjectId,
  coverNote: String,
  status: { type: String, default: "submitted" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Job = mongoose.model("Job", jobSchema);
const Application = mongoose.model("Application", applicationSchema);

let memoryUsers = [];

let memoryJobs = [
  {
    _id: "demo1",
    title: "Frontend Engineer",
    company: "Northstar Labs",
    skills: ["React", "TypeScript", "CSS"],
    salary: "₹8–12 LPA",
    type: "Full-time",
    location: "Remote",
    description: "Build modern web interfaces.",
    status: "open"
  },
  {
    _id: "demo2",
    title: "Backend Developer",
    company: "CloudForge",
    skills: ["Node.js", "Express", "MongoDB"],
    salary: "₹10–15 LPA",
    type: "Full-time",
    location: "Hybrid",
    description: "Design APIs and backend services.",
    status: "open"
  },
  {
    _id: "demo3",
    title: "Data Analyst Intern",
    company: "InsightWorks",
    skills: ["SQL", "Python", "Excel"],
    salary: "₹20k–30k/month",
    type: "Internship",
    location: "On-site",
    description: "Support business analytics.",
    status: "open"
  }
];

let memoryApplications = [];

let dbReady = false;

async function connectDB() {
  if (!process.env.MONGODB_URI) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    dbReady = true;
    console.log("MongoDB connected");
  } catch (e) {
    console.log("MongoDB unavailable:", e.message);
    console.log(e);
  }
}

async function startServer() {
  await connectDB();

  app.listen(PORT, () =>
    console.log(
      `JobSphere API running on http://localhost:${PORT} (${dbReady ? "mongodb" : "memory"} mode)`
    )
  );
}

function tokenFor(u) {
  return jwt.sign(
    { id: String(u._id), role: u.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";

    if (!h.startsWith("Bearer ")) throw Error();

    req.auth = jwt.verify(h.slice(7), JWT_SECRET);

    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
}

async function getUser(id) {
  if (dbReady) return User.findById(id);

  return memoryUsers.find(
    u => String(u._id) === String(id)
  );
}

function safeUser(u) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    company: u.company,
    token: tokenFor(u)
  };
}

app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    database: dbReady ? "mongodb" : "memory"
  })
);

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "candidate",
      company = ""
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    let existing = dbReady
      ? await User.findOne({ email })
      : memoryUsers.find(u => u.email === email);

    if (existing) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const u = {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      company
    };

    const created = dbReady
      ? await User.create(u)
      : Object.assign(
          { _id: crypto.randomUUID() },
          u
        );

    if (!dbReady) memoryUsers.push(created);

    res.status(201).json({
      user: safeUser(created)
    });
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const u = dbReady
      ? await User.findOne({ email })
      : memoryUsers.find(x => x.email === email);

    if (
      !u ||
      !(await bcrypt.compare(password, u.passwordHash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      user: safeUser(u)
    });
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = dbReady
      ? await Job.find({ status: "open" }).sort({
          createdAt: -1
        })
      : memoryJobs.filter(j => j.status === "open");

    res.json(jobs);
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.post("/api/jobs", auth, async (req, res) => {
  if (req.auth.role !== "recruiter") {
    return res.status(403).json({
      message: "Recruiter access required"
    });
  }

  try {
    const u = await getUser(req.auth.id);

    const data = {
      ...req.body,
      recruiterId: req.auth.id,
      company: req.body.company || u?.company,
      status: req.body.status || "open"
    };

    const job = dbReady
      ? await Job.create(data)
      : Object.assign(
          { _id: crypto.randomUUID() },
          data
        );

    if (!dbReady) memoryJobs.unshift(job);

    res.status(201).json(job);
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.post("/api/applications", auth, async (req, res) => {
  if (req.auth.role !== "candidate") {
    return res.status(403).json({
      message: "Candidate access required"
    });
  }

  try {
    let exists;

    if (dbReady) {
      exists = await Application.findOne({
        jobId: req.body.jobId,
        candidateId: req.auth.id
      });
    } else {
      exists = memoryApplications.find(
        a =>
          a.jobId === req.body.jobId &&
          a.candidateId === req.auth.id
      );
    }

    if (exists) {
      return res.status(409).json({
        message: "You already applied for this role"
      });
    }

    const a = {
      jobId: req.body.jobId,
      candidateId: req.auth.id,
      coverNote: req.body.coverNote
    };

    const created = dbReady
      ? await Application.create(a)
      : Object.assign(
          { _id: crypto.randomUUID() },
          a
        );

    if (!dbReady) memoryApplications.push(created);

    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.get("/api/dashboard/candidate", auth, async (req, res) => {
  if (req.auth.role !== "candidate") {
    return res.status(403).json({
      message: "Candidate access required"
    });
  }

  try {
    let apps = dbReady
      ? await Application.find({
          candidateId: req.auth.id
        }).sort({ createdAt: -1 })
      : memoryApplications.filter(
          a => a.candidateId === req.auth.id
        );

    let out = [];

    for (const a of apps) {
      const j = dbReady
        ? await Job.findById(a.jobId)
        : memoryJobs.find(x => x._id === a.jobId);

      if (j) {
        out.push({
          ...(a.toObject?.() || a),
          jobTitle: j.title,
          company: j.company
        });
      }
    }

    res.json({
      applications: out
    });
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

app.get("/api/dashboard/recruiter", auth, async (req, res) => {
  if (req.auth.role !== "recruiter") {
    return res.status(403).json({
      message: "Recruiter access required"
    });
  }

  try {
    const jobs = dbReady
      ? await Job.find({
          recruiterId: req.auth.id
        }).sort({ createdAt: -1 })
      : memoryJobs.filter(
          j => j.recruiterId === req.auth.id
        );

    let apps = dbReady
      ? await Application.find({})
      : memoryApplications;

    let out = [];

    for (const a of apps) {
      const j = dbReady
        ? await Job.findOne({
            _id: a.jobId,
            recruiterId: req.auth.id
          })
        : jobs.find(x => x._id === a.jobId);

      if (j) {
        const c = await getUser(a.candidateId);

        out.push({
          ...(a.toObject?.() || a),
          candidateName: c?.name || "Candidate",
          jobTitle: j.title
        });
      }
    }

    res.json({
      jobs,
      applications: out
    });
  } catch (e) {
    res.status(500).json({
      message: e.message
    });
  }
});

startServer();