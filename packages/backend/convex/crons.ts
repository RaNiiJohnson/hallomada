import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Ends recruiter access to candidate CVs after the retention window and deletes
// the stored files that nothing else uses.
crons.interval(
  "purge expired application CVs",
  { hours: 24 },
  internal.jobs.applicationCv.purgeExpiredApplicationCvs,
  {},
);

// Ends landlord access to rental dossiers once their access window is over.
crons.interval(
  "expire rental dossier access",
  { hours: 1 },
  internal.rentalFiles.send.expireAccess,
  {},
);

export default crons;
