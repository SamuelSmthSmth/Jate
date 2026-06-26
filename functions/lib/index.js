"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ics = __importStar(require("ics"));
admin.initializeApp();
exports.api = functions.https.onRequest(async (req, res) => {
    // Check for the user query parameter
    const userId = req.query.user;
    if (!userId) {
        res.status(400).send("Missing 'user' query parameter.");
        return;
    }
    try {
        const db = admin.firestore();
        const jobsSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("jobs")
            .where("isArchived", "==", false)
            .get();
        const events = [];
        jobsSnapshot.forEach((doc) => {
            const job = doc.data();
            const company = job.company || "Unknown Company";
            const title = job.title || "Job Application";
            if (job.deadlines) {
                // Signup Deadline
                if (job.deadlines.signup) {
                    const date = new Date(job.deadlines.signup);
                    events.push({
                        start: [date.getFullYear(), date.getMonth() + 1, date.getDate()],
                        title: `Deadline: ${company} - ${title}`,
                        description: `Application deadline for ${title} at ${company}.`,
                        url: job.url || undefined,
                        status: 'CONFIRMED',
                        busyStatus: 'FREE',
                        duration: { days: 1 }
                    });
                }
                // Interview Deadline
                if (job.deadlines.interview) {
                    const date = new Date(job.deadlines.interview);
                    events.push({
                        start: [date.getFullYear(), date.getMonth() + 1, date.getDate()],
                        title: `INTERVIEW: ${company}`,
                        description: `Interview scheduled for ${title} at ${company}.`,
                        url: job.url || undefined,
                        status: 'CONFIRMED',
                        busyStatus: 'BUSY',
                        duration: { days: 1 }
                    });
                }
            }
        });
        if (events.length === 0) {
            // Create a dummy event so calendar doesn't fail parsing an empty ICS
            const today = new Date();
            events.push({
                start: [today.getFullYear(), today.getMonth() + 1, today.getDate()],
                title: "Jate: No Deadlines",
                description: "You have no upcoming deadlines saved in Jate.",
                busyStatus: "FREE",
                duration: { days: 1 }
            });
        }
        ics.createEvents(events, (error, value) => {
            if (error) {
                console.error("Error creating ICS feed", error);
                res.status(500).send("Internal Server Error");
                return;
            }
            res.setHeader("Content-Type", "text/calendar; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="jate-${userId}.ics"`);
            res.status(200).send(value);
        });
    }
    catch (error) {
        console.error("Error fetching jobs", error);
        res.status(500).send("Internal Server Error");
    }
});
//# sourceMappingURL=index.js.map