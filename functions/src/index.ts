import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as ics from "ics";

admin.initializeApp();

export const api = functions.https.onRequest(async (req, res) => {
  // Check for the user query parameter
  const userId = req.query.user as string;
  
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

    const events: ics.EventAttributes[] = [];

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
  } catch (error) {
    console.error("Error fetching jobs", error);
    res.status(500).send("Internal Server Error");
  }
});
