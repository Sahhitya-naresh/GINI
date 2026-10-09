var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/data/defaultTemplates.ts
function extractFirstName(fullName) {
  if (!fullName) return "there";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "there";
}
function renderEmailMergeTags(templateString, lead, senderName = "Our Team") {
  const firstName = lead.firstName || extractFirstName(lead.name || "");
  const lastName = lead.lastName || (lead.name ? lead.name.split(" ").slice(1).join(" ") : "");
  const company = lead.company || "your company";
  const painPoint = lead.painPoint || "workflow efficiency bottlenecks";
  const name = lead.name || (firstName ? `${firstName} ${lastName}`.trim() : "there");
  const jobTitle = lead.jobTitle || "team lead";
  const industry = lead.industry || "your industry";
  const linkedinUrl = lead.linkedinUrl || "";
  const campaign = lead.campaign || "";
  return templateString.replace(/\{\{\s*first_name\s*\}\}/gi, firstName).replace(/\{\{\s*last_name\s*\}\}/gi, lastName).replace(/\{\{\s*name\s*\}\}/gi, name).replace(/\{\{\s*company\s*\}\}/gi, company).replace(/\{\{\s*job_title\s*\}\}/gi, jobTitle).replace(/\{\{\s*industry\s*\}\}/gi, industry).replace(/\{\{\s*pain_point\s*\}\}/gi, painPoint).replace(/\{\{\s*linkedin_url\s*\}\}/gi, linkedinUrl).replace(/\{\{\s*campaign\s*\}\}/gi, campaign).replace(/\{\{\s*sender_name\s*\}\}/gi, senderName);
}
var DEFAULT_STAGE_TEMPLATES;
var init_defaultTemplates = __esm({
  "src/data/defaultTemplates.ts"() {
    DEFAULT_STAGE_TEMPLATES = [
      {
        stage: 1,
        name: "Introduction",
        purpose: "Who we are, company name, and what we do",
        defaultGapDays: 3,
        subject: "Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I noticed your work leading initiatives at {{company}}. I'm reaching out because we help growing teams resolve {{pain_point}} without hiring extra overhead or changing existing workflows.</p>
      <p style="margin: 0 0 14px 0;">Are you open to a brief 5-minute sync later this week to see how this compares to your current setup?</p>
      <p style="margin: 0 0 4px 0;">Best regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 2,
        name: "Value Proposition",
        purpose: "Why this email is worth reading",
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Following up on my note earlier. When companies tackle {{pain_point}}, they usually face two friction points: slow turnaround cycles and fragmented execution.</p>
      <p style="margin: 0 0 14px 0;">We created an automated framework that eliminates both within 14 days, saving teams roughly 12 hours every week per team member.</p>
      <p style="margin: 0 0 14px 0;">Would Tuesday or Thursday morning work for a quick walkthrough?</p>
      <p style="margin: 0 0 4px 0;">Cheers,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 3,
        name: "Proof & Case Study",
        purpose: "Case study / one-pager / deck, includes a hyperlink",
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Rather than just talking features, here is how a team facing {{pain_point}} solved it in practice:</p>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <tr>
          <td style="padding: 14px 18px;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #0f172a;">Customer Story: 3.4x faster resolution</p>
            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">How Apex Systems automated their bottleneck in under 3 weeks.</p>
            <a href="https://example.com/case-study" target="_blank" style="display: inline-block; color: #2563eb; text-decoration: underline; font-weight: 500; font-size: 14px;">View 1-Page Summary &rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0;">Would you find value in reviewing similar benchmarks for {{company}}?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 4,
        name: "Solution",
        purpose: "Addresses the lead's specific pain point(s)",
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Thinking specifically about {{company}} and {{pain_point}} \u2014 here is how our tailored solution targets this challenge directly:</p>
      <p style="margin: 0 0 10px 0; padding-left: 10px; border-left: 3px solid #2563eb; color: #334155;">
        <strong>Direct Remediation:</strong> Automates routine verification, flags anomalies before delivery, and synchronizes updates in real time.
      </p>
      <p style="margin: 0 0 14px 0;">It plugs right into what you already use with no engineering lift needed on your side.</p>
      <p style="margin: 0 0 14px 0;">Does this align with your priorities this quarter?</p>
      <p style="margin: 0 0 4px 0;">Warm regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 5,
        name: "Pricing & Scope",
        purpose: 'High-level, framed as "to be discussed"',
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">A common question at this stage is investment and structure. We keep our engagement model flexible and tied directly to measurable outcomes.</p>
      <p style="margin: 0 0 14px 0;">Depending on the rollout scale for {{company}}, pricing is modular and can be shaped around your target ROI \u2014 to be discussed once we verify exact fit.</p>
      <p style="margin: 0 0 14px 0;">Do you have 10 minutes next Wednesday to review numbers and options together?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 6,
        name: "Follow-up",
        purpose: "Re-references stages 1\u20133, for leads who've gone quiet",
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I know how packed schedules get. Circling back to my earlier notes on addressing {{pain_point}} at {{company}}.</p>
      <p style="margin: 0 0 14px 0;">Between the workflow automation we discussed and the verified results in our case study, I'm confident we could free up substantial bandwidth for your team.</p>
      <p style="margin: 0 0 14px 0;">If timing is tight right now, just let me know if next month is better.</p>
      <p style="margin: 0 0 4px 0;">Thanks,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      },
      {
        stage: 7,
        name: "Break-up",
        purpose: "Polite close-out, door left open for future contact",
        defaultGapDays: 3,
        subject: "Re: Quick question regarding {{company}}",
        bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I haven't heard back, so I assume tackling {{pain_point}} isn't a priority for {{company}} right now \u2014 totally understandable.</p>
      <p style="margin: 0 0 14px 0;">This will be my last email. If things change down the road or you'd ever like to reconnect, my door is always open.</p>
      <p style="margin: 0 0 14px 0;">Wishing you and {{company}} continued success!</p>
      <p style="margin: 0 0 4px 0;">All the best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
      }
    ];
  }
});

// server/templateBackend.ts
var templateBackend_exports = {};
__export(templateBackend_exports, {
  DEFAULT_SET_ID: () => DEFAULT_SET_ID,
  cloneDefaultStages: () => cloneDefaultStages,
  composeFullEmail: () => composeFullEmail,
  createTemplateSetForNewCampaign: () => createTemplateSetForNewCampaign,
  createTemplateSetForNewUser: () => createTemplateSetForNewUser,
  deleteUserTemplateSet: () => deleteUserTemplateSet,
  ensureTemplateSetsAndSeed: () => ensureTemplateSetsAndSeed,
  getCampaignTemplateImpact: () => getCampaignTemplateImpact,
  getCampaignTemplateSet: () => getCampaignTemplateSet,
  getDefaultTemplateSet: () => getDefaultTemplateSet,
  getTemplateSetById: () => getTemplateSetById,
  getUserTemplateSet: () => getUserTemplateSet,
  resetUserTemplateSetToDefault: () => resetUserTemplateSetToDefault,
  resolveEmailContent: () => resolveEmailContent,
  restoreTemplateSetVersion: () => restoreTemplateSetVersion,
  sanitizeHtml: () => sanitizeHtml,
  saveTemplateSet: () => saveTemplateSet
});
function cloneDefaultStages() {
  return DEFAULT_STAGE_TEMPLATES.map((t) => ({
    stage: t.stage,
    name: t.name,
    purpose: t.purpose,
    defaultGapDays: t.defaultGapDays,
    subject: t.subject,
    bodyHtml: t.bodyHtml
  }));
}
async function ensureTemplateSetsAndSeed() {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  await Promise.all([
    col.createIndex({ id: 1 }, { unique: true, name: "idx_templatesets_id_unique" }).catch(() => {
    }),
    col.createIndex({ kind: 1, ownerId: 1 }, { name: "idx_templatesets_owner" }).catch(() => {
    }),
    col.createIndex({ kind: 1, campaignId: 1 }, { name: "idx_templatesets_campaign" }).catch(() => {
    })
  ]);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingDefault = await col.findOne({ id: DEFAULT_SET_ID });
  if (!existingDefault) {
    const defaultSet = {
      id: DEFAULT_SET_ID,
      kind: "default",
      name: "Admin Default Sequence",
      stages: cloneDefaultStages(),
      version: 1,
      history: [],
      updatedBy: "System",
      updatedAt: now,
      createdAt: now
    };
    await col.insertOne(defaultSet);
    console.log("[TemplateSets] Initialized Admin Default templateSet");
  }
  const usersCol = db.collection(COLLECTIONS.USERS);
  const allUsers = await usersCol.find({}).toArray();
  for (const user of allUsers) {
    const existingUserSet = await col.findOne({ kind: "user", ownerId: user.id });
    if (!existingUserSet) {
      const userSet = {
        id: `tplset-user-${user.id}`,
        kind: "user",
        ownerId: user.id,
        name: `${user.name || user.email}'s Personal Sequence`,
        stages: cloneDefaultStages(),
        version: 1,
        history: [],
        updatedBy: "System",
        updatedAt: now,
        createdAt: now
      };
      await col.insertOne(userSet);
      console.log(`[TemplateSets] Backfilled personal templateSet for user ${user.email} (${user.id})`);
    }
  }
  const campCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const allCampaigns = await campCol.find({}).toArray();
  for (const camp of allCampaigns) {
    const existingCampSet = await col.findOne({ kind: "campaign", campaignId: camp.id });
    if (!existingCampSet) {
      const campSet = {
        id: `tplset-camp-${camp.id}`,
        kind: "campaign",
        campaignId: camp.id,
        name: `${camp.name || "Campaign"} Sequence`,
        stages: cloneDefaultStages(),
        version: 1,
        history: [],
        updatedBy: camp.lastEditedBy || camp.ownerName || "System",
        updatedAt: now,
        createdAt: now
      };
      await col.insertOne(campSet);
      console.log(`[TemplateSets] Backfilled campaign templateSet for campaign ${camp.name} (${camp.id})`);
    }
  }
}
async function getDefaultTemplateSet() {
  const db = await getDb();
  let defaultSet = await db.collection(COLLECTIONS.TEMPLATE_SETS).findOne({ id: DEFAULT_SET_ID }, { projection: { _id: 0 } });
  if (!defaultSet) {
    await ensureTemplateSetsAndSeed();
    defaultSet = await db.collection(COLLECTIONS.TEMPLATE_SETS).findOne({ id: DEFAULT_SET_ID }, { projection: { _id: 0 } });
  }
  return defaultSet;
}
async function getUserTemplateSet(userId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  let userSet = await col.findOne({ kind: "user", ownerId: userId }, { projection: { _id: 0 } });
  if (!userSet) {
    const defaultSet = await getDefaultTemplateSet();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    userSet = {
      id: `tplset-user-${userId}`,
      kind: "user",
      ownerId: userId,
      name: `User Personal Sequence`,
      stages: defaultSet.stages.map((s) => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: "System",
      updatedAt: now,
      createdAt: now
    };
    await col.updateOne({ id: userSet.id }, { $set: userSet }, { upsert: true });
  }
  return userSet;
}
async function getCampaignTemplateSet(campaignId, campaignName) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  let campSet = await col.findOne({ kind: "campaign", campaignId }, { projection: { _id: 0 } });
  if (!campSet) {
    const defaultSet = await getDefaultTemplateSet();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    campSet = {
      id: `tplset-camp-${campaignId}`,
      kind: "campaign",
      campaignId,
      name: `${campaignName || "Campaign"} Sequence`,
      stages: defaultSet.stages.map((s) => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: "System",
      updatedAt: now,
      createdAt: now
    };
    await col.updateOne({ id: campSet.id }, { $set: campSet }, { upsert: true });
  }
  return campSet;
}
async function getTemplateSetById(id) {
  const db = await getDb();
  return db.collection(COLLECTIONS.TEMPLATE_SETS).findOne({ id }, { projection: { _id: 0 } });
}
async function saveTemplateSet(setId, updatedStages, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  const existing = await col.findOne({ id: setId });
  if (!existing) {
    const err = new Error("Template set not found");
    err.status = 404;
    throw err;
  }
  const isAdmin = requestingUser.role === "admin";
  const hasPerm = (p) => isAdmin || Boolean(requestingUser.permissions?.includes(p));
  if (existing.kind === "default") {
    if (!hasPerm("templates.editDefault") && !isAdmin) {
      const err = new Error("Forbidden: Only administrators can edit the default template set");
      err.status = 403;
      throw err;
    }
  } else if (existing.kind === "user") {
    const isOwner = existing.ownerId === requestingUser.id;
    if (isOwner) {
      if (!hasPerm("templates.editOwn") && !isAdmin) {
        const err = new Error("Forbidden: Missing permission to edit your personal templates");
        err.status = 403;
        throw err;
      }
    } else {
      if (!hasPerm("templates.editAny") && !isAdmin) {
        const err = new Error("Forbidden: Missing permission to edit other users templates");
        err.status = 403;
        throw err;
      }
    }
  } else if (existing.kind === "campaign") {
    const camp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ id: existing.campaignId });
    const isCampOwner = camp?.ownerId === requestingUser.id;
    if (!isCampOwner && !hasPerm("campaigns.editAny") && !isAdmin) {
      const err = new Error("Forbidden: Only the campaign owner or an admin can edit the campaign templates");
      err.status = 403;
      throw err;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];
  const snapshot = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || "System",
    editedAt: existing.updatedAt || now
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;
  const completeStages = [];
  for (let s = 1; s <= 7; s++) {
    const incoming = updatedStages.find((st) => st.stage === s);
    const prev = existing.stages.find((st) => st.stage === s) || DEFAULT_STAGE_TEMPLATES.find((st) => st.stage === s);
    completeStages.push({
      stage: s,
      name: incoming?.name || prev.name,
      purpose: incoming?.purpose || prev.purpose,
      defaultGapDays: incoming?.defaultGapDays ?? prev.defaultGapDays ?? 3,
      subject: incoming?.subject !== void 0 ? incoming.subject : prev.subject,
      bodyHtml: incoming?.bodyHtml !== void 0 ? incoming.bodyHtml : prev.bodyHtml
    });
  }
  const updatedDoc = {
    ...existing,
    stages: completeStages,
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || "User",
    updatedAt: now
  };
  await col.updateOne({ id: setId }, { $set: updatedDoc });
  return updatedDoc;
}
async function restoreTemplateSetVersion(setId, targetVersion, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  const existing = await col.findOne({ id: setId });
  if (!existing) {
    const err = new Error("Template set not found");
    err.status = 404;
    throw err;
  }
  const isAdmin = requestingUser.role === "admin";
  const hasPerm = (p) => isAdmin || Boolean(requestingUser.permissions?.includes(p));
  if (existing.kind === "default" && !hasPerm("templates.editDefault") && !isAdmin) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  if (existing.kind === "user" && existing.ownerId !== requestingUser.id && !hasPerm("templates.editAny") && !isAdmin) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  const targetSnapshot = existing.history?.find((h) => h.version === targetVersion);
  if (!targetSnapshot) {
    const err = new Error(`Version ${targetVersion} not found in template set history`);
    err.status = 404;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];
  const snapshot = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || "System",
    editedAt: existing.updatedAt || now,
    changeNote: `Restored from version ${targetVersion}`
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;
  const restoredDoc = {
    ...existing,
    stages: targetSnapshot.stages,
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || "User",
    updatedAt: now
  };
  await col.updateOne({ id: setId }, { $set: restoredDoc });
  return restoredDoc;
}
async function resetUserTemplateSetToDefault(userId, requestingUser) {
  const isAdmin = requestingUser.role === "admin";
  const isOwner = requestingUser.id === userId;
  if (!isOwner && !isAdmin) {
    const err = new Error("Forbidden: You can only reset your own template set");
    err.status = 403;
    throw err;
  }
  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  const existing = await getUserTemplateSet(userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];
  const snapshot = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || "System",
    editedAt: existing.updatedAt || now,
    changeNote: "Reset to Admin Default"
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;
  const resetDoc = {
    ...existing,
    stages: defaultSet.stages.map((s) => ({ ...s })),
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || "User",
    updatedAt: now
  };
  await col.updateOne({ id: existing.id }, { $set: resetDoc });
  return resetDoc;
}
async function createTemplateSetForNewUser(userId, userName) {
  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userSet = {
    id: `tplset-user-${userId}`,
    kind: "user",
    ownerId: userId,
    name: `${userName || "User"}'s Personal Sequence`,
    stages: defaultSet.stages.map((s) => ({ ...s })),
    version: 1,
    history: [],
    updatedBy: "System",
    updatedAt: now,
    createdAt: now
  };
  await col.updateOne({ id: userSet.id }, { $set: userSet }, { upsert: true });
  return userSet;
}
async function createTemplateSetForNewCampaign(campaignId, campaignName, requestingUser) {
  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TEMPLATE_SETS);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const campSet = {
    id: `tplset-camp-${campaignId}`,
    kind: "campaign",
    campaignId,
    name: `${campaignName || "Campaign"} Sequence`,
    stages: defaultSet.stages.map((s) => ({ ...s })),
    version: 1,
    history: [],
    updatedBy: requestingUser?.name || "System",
    updatedAt: now,
    createdAt: now
  };
  await col.updateOne({ id: campSet.id }, { $set: campSet }, { upsert: true });
  return campSet;
}
async function deleteUserTemplateSet(userId) {
  const db = await getDb();
  const res = await db.collection(COLLECTIONS.TEMPLATE_SETS).deleteOne({ kind: "user", ownerId: userId });
  return res.deletedCount > 0;
}
async function getCampaignTemplateImpact(campaignId) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const leads = await leadsCol.find({
    campaignId: campaignId.trim(),
    status: "Active",
    templateSource: { $ne: "own" }
  }).toArray();
  const userIds = /* @__PURE__ */ new Set();
  const userNames = /* @__PURE__ */ new Set();
  for (const l of leads) {
    if (l.ownerId) userIds.add(l.ownerId);
    if (l.ownerName) userNames.add(l.ownerName);
  }
  return {
    affectedLeadsCount: leads.length,
    userCount: userIds.size,
    affectedUserNames: Array.from(userNames)
  };
}
async function resolveEmailContent(lead, stageNumOrNode) {
  let stageNum = typeof stageNumOrNode === "number" ? stageNumOrNode : 1;
  let customNodeSubject;
  let customNodeBody;
  if (typeof stageNumOrNode === "object" && stageNumOrNode !== null) {
    const nodeData = stageNumOrNode.data || stageNumOrNode;
    stageNum = nodeData.templateStage || nodeData.stage || stageNum;
    const body = nodeData.customBodyHtml !== void 0 ? nodeData.customBodyHtml : nodeData.customBody;
    if (nodeData.useCustomTemplate || nodeData.customSubject !== void 0 || body !== void 0) {
      if (nodeData.customSubject !== void 0) customNodeSubject = String(nodeData.customSubject);
      if (body !== void 0) customNodeBody = String(body);
    }
  }
  if (customNodeSubject !== void 0 || customNodeBody !== void 0) {
    return {
      subject: customNodeSubject || "",
      bodyHtml: (customNodeBody || "").replace(/\n/g, "<br/>"),
      templateSourceUsed: "custom_node",
      stage: stageNum
    };
  }
  if (lead.templateSource === "own" && lead.ownerId) {
    const userSet = await getUserTemplateSet(lead.ownerId);
    const stageItem2 = userSet.stages.find((s) => s.stage === stageNum) || userSet.stages[0];
    if (stageItem2) {
      return {
        subject: stageItem2.subject,
        bodyHtml: stageItem2.bodyHtml,
        templateSourceUsed: "user",
        version: userSet.version,
        stage: stageNum
      };
    }
  }
  if (lead.campaignId) {
    const campSet = await getCampaignTemplateSet(lead.campaignId);
    const stageItem2 = campSet.stages.find((s) => s.stage === stageNum) || campSet.stages[0];
    if (stageItem2) {
      return {
        subject: stageItem2.subject,
        bodyHtml: stageItem2.bodyHtml,
        templateSourceUsed: "campaign",
        version: campSet.version,
        stage: stageNum
      };
    }
  }
  if (lead.ownerId) {
    const userSet = await getUserTemplateSet(lead.ownerId);
    const stageItem2 = userSet.stages.find((s) => s.stage === stageNum) || userSet.stages[0];
    if (stageItem2) {
      return {
        subject: stageItem2.subject,
        bodyHtml: stageItem2.bodyHtml,
        templateSourceUsed: "user",
        version: userSet.version,
        stage: stageNum
      };
    }
  }
  const defaultSet = await getDefaultTemplateSet();
  const stageItem = defaultSet.stages.find((s) => s.stage === stageNum) || defaultSet.stages[0];
  return {
    subject: stageItem?.subject || "Introduction",
    bodyHtml: stageItem?.bodyHtml || "",
    templateSourceUsed: "default",
    version: defaultSet.version,
    stage: stageNum
  };
}
function sanitizeHtml(html) {
  if (!html) return "";
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "").replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "").replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"');
  return cleaned;
}
function composeFullEmail(options) {
  const {
    bodyHtml,
    headerHtml,
    header,
    footerHtml,
    footer,
    lead,
    stage = 1,
    senderDisplayName,
    baseUrl,
    embedTrackingPixel = false
  } = options;
  const effectiveHeader = headerHtml !== void 0 ? headerHtml : header || "";
  const effectiveFooter = footerHtml !== void 0 ? footerHtml : footer || "";
  const effectiveSenderName = senderDisplayName || "Outreach Flow";
  const sanitizedHeader = sanitizeHtml(effectiveHeader);
  const sanitizedFooter = sanitizeHtml(effectiveFooter);
  const renderedHeader = sanitizedHeader ? renderEmailMergeTags(sanitizedHeader, lead || {}, effectiveSenderName) : "";
  const renderedBody = renderEmailMergeTags(bodyHtml, lead || {}, effectiveSenderName);
  const renderedFooter = sanitizedFooter ? renderEmailMergeTags(sanitizedFooter, lead || {}, effectiveSenderName) : "";
  let trackedBody = renderedBody;
  if (lead && baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const campaignParam = encodeURIComponent(lead.campaign || "Default");
    const leadIdParam = encodeURIComponent(lead.leadId || "");
    const leadEmailParam = encodeURIComponent(lead.email || "");
    trackedBody = renderedBody.replace(
      /<a\s+([^>]*?)href\s*=\s*(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
      (_match, pre, quote, originalUrl, post) => {
        if (originalUrl.includes("/api/track/click")) return _match;
        const clickTrackUrl = `${cleanBase}/api/track/click?url=${encodeURIComponent(originalUrl)}&leadId=${leadIdParam}&email=${leadEmailParam}&stage=${stage}&campaign=${campaignParam}`;
        return `<a ${pre}href=${quote}${clickTrackUrl}${quote}${post}>`;
      }
    );
  }
  const sections = [];
  if (renderedHeader.trim()) {
    sections.push(`<div class="email-header" style="margin-bottom: 20px;">${renderedHeader}</div>`);
  }
  sections.push(`<div class="email-body">${trackedBody}</div>`);
  if (renderedFooter.trim()) {
    sections.push(`<div class="email-footer" style="margin-top: 28px;">${renderedFooter}</div>`);
  }
  let composedHtml = sections.join("\n");
  if (embedTrackingPixel && lead && baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const campaignParam = encodeURIComponent(lead.campaign || "Default");
    const leadIdParam = encodeURIComponent(lead.leadId || "");
    const leadEmailParam = encodeURIComponent(lead.email || "");
    const openTrackUrl = `${cleanBase}/api/track/open?leadId=${leadIdParam}&email=${leadEmailParam}&stage=${stage}&campaign=${campaignParam}&t=${Date.now()}`;
    const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;
    if (composedHtml.includes("</body>")) {
      composedHtml = composedHtml.replace("</body>", `${pixelTag}</body>`);
    } else {
      composedHtml += `
${pixelTag}`;
    }
  }
  const plainText = composedHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const charCount = plainText.length;
  const isLikelyLong = charCount > 1500;
  return {
    composedHtml,
    renderedHeader,
    renderedBody,
    renderedFooter,
    isLikelyLong,
    charCount
  };
}
var DEFAULT_SET_ID;
var init_templateBackend = __esm({
  "server/templateBackend.ts"() {
    init_mongodb();
    init_defaultTemplates();
    DEFAULT_SET_ID = "tplset-default";
  }
});

// server/auth.ts
var auth_exports = {};
__export(auth_exports, {
  LocalAuthProvider: () => LocalAuthProvider,
  SESSION_COOKIE_NAME: () => SESSION_COOKIE_NAME,
  checkLockout: () => checkLockout,
  clearLockout: () => clearLockout,
  clearSessionCookie: () => clearSessionCookie,
  createSessionToken: () => createSessionToken,
  getAuthProvider: () => getAuthProvider,
  getSessionTokenFromRequest: () => getSessionTokenFromRequest,
  hashPassword: () => hashPassword,
  parseCookies: () => parseCookies,
  recordFailedAttempt: () => recordFailedAttempt,
  sanitizeUser: () => sanitizeUser,
  seedInitialUsers: () => seedInitialUsers,
  setSessionCookie: () => setSessionCookie,
  verifyPassword: () => verifyPassword,
  verifySessionToken: () => verifySessionToken
});
import crypto from "crypto";
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}
function verifyPassword(password, combinedHash) {
  return new Promise((resolve) => {
    if (!password || !combinedHash) return resolve(false);
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        if (keyBuffer.length !== derivedKey.length) return resolve(false);
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}
function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.auth_secret || "gini_outreach_flow_stateless_secret_key_2026";
}
function base64UrlEncode(str) {
  return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}
function createSessionToken(user) {
  const payload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS
  };
  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);
  const signature = crypto.createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
  try {
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }
    const payloadString = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadString);
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1e3)}`
  ];
  if (isProd) {
    cookieOptions.push("Secure");
  }
  res.setHeader("Set-Cookie", cookieOptions.join("; "));
}
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
  if (isProd) {
    cookieOptions.push("Secure");
  }
  res.setHeader("Set-Cookie", cookieOptions.join("; "));
}
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  const pairs = header.split(";");
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split("=");
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join("=").trim());
    }
  }
  return cookies;
}
function getSessionTokenFromRequest(req) {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[SESSION_COOKIE_NAME]) {
      return cookies[SESSION_COOKIE_NAME];
    }
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}
async function checkLockout(email, ip) {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;
    const record = await db.collection("auth_lockouts").findOne({ key: lockKey });
    if (!record) return { isLocked: false };
    if (record.lockoutUntil) {
      const lockoutExpiry = new Date(record.lockoutUntil).getTime();
      const now = Date.now();
      if (now < lockoutExpiry) {
        const remainingMinutes = Math.ceil((lockoutExpiry - now) / 6e4);
        return { isLocked: true, remainingMinutes: Math.max(1, remainingMinutes) };
      } else {
        await db.collection("auth_lockouts").deleteOne({ key: lockKey });
        return { isLocked: false };
      }
    }
    return { isLocked: false };
  } catch (err) {
    console.warn("[Auth Lockout] Error checking lockout:", err);
    return { isLocked: false };
  }
}
async function recordFailedAttempt(email, ip) {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;
    const now = /* @__PURE__ */ new Date();
    const existing = await db.collection("auth_lockouts").findOne({ key: lockKey });
    const currentAttempts = (existing?.attempts || 0) + 1;
    let lockoutUntil = void 0;
    let isLocked = false;
    let remainingMinutes = void 0;
    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      isLocked = true;
      remainingMinutes = 15;
    }
    await db.collection("auth_lockouts").updateOne(
      { key: lockKey },
      {
        $set: {
          key: lockKey,
          email: cleanEmail,
          ip,
          attempts: currentAttempts,
          ...lockoutUntil ? { lockoutUntil } : {},
          lastAttemptAt: now
        }
      },
      { upsert: true }
    );
    return { attempts: currentAttempts, isLocked, remainingMinutes };
  } catch (err) {
    console.warn("[Auth Lockout] Error recording failed attempt:", err);
    return { attempts: 1, isLocked: false };
  }
}
async function clearLockout(email, ip) {
  try {
    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const lockKey = `${cleanEmail}::${ip}`;
    await db.collection("auth_lockouts").deleteOne({ key: lockKey });
  } catch (err) {
    console.warn("[Auth Lockout] Error clearing lockout:", err);
  }
}
function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null
  };
}
function getAuthProvider() {
  const provider = process.env.AUTH_PROVIDER || "local";
  if (provider === "local") {
    return new LocalAuthProvider();
  }
  return new LocalAuthProvider();
}
async function seedInitialUsers() {
  try {
    const db = await getDb();
    const usersCol = db.collection("users");
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.admin_email || "admin@example.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.admin_password || "AdminPassword123!";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingAdmin = await usersCol.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminHash = await hashPassword(adminPassword);
      const adminUser = {
        id: `usr_${Date.now()}_admin`,
        name: process.env.ADMIN_NAME || process.env.admin_name || "System Admin",
        email: adminEmail,
        passwordHash: adminHash,
        role: "admin",
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        lastLoginAt: null
      };
      await usersCol.insertOne(adminUser);
      console.log(`[Auth] Created admin user: ${adminEmail}`);
      try {
        const { createTemplateSetForNewUser: createTemplateSetForNewUser2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
        await createTemplateSetForNewUser2(adminUser.id, adminUser.name);
      } catch (err) {
        console.warn("[Auth] Note on admin template set creation:", err);
      }
    } else {
      const explicitPassword = process.env.ADMIN_PASSWORD || process.env.admin_password;
      if (explicitPassword) {
        const adminHash = await hashPassword(explicitPassword);
        await usersCol.updateOne(
          { email: adminEmail },
          { $set: { passwordHash: adminHash, isActive: true, role: "admin" } }
        );
        console.log(`[Auth] Synced admin password from environment for: ${adminEmail}`);
      }
    }
    const userEmailRaw = process.env.USER_EMAIL || process.env.user_email;
    const userPasswordRaw = process.env.USER_PASSWORD || process.env.user_password;
    if (userEmailRaw && userPasswordRaw) {
      const userEmail = userEmailRaw.toLowerCase().trim();
      const existingUser = await usersCol.findOne({ email: userEmail });
      if (!existingUser) {
        const userHash = await hashPassword(userPasswordRaw);
        const standardUser = {
          id: `usr_${Date.now() + 1}_user`,
          name: process.env.USER_NAME || process.env.user_name || "Standard User",
          email: userEmail,
          passwordHash: userHash,
          role: "user",
          isActive: true,
          mustChangePassword: false,
          createdAt: now,
          lastLoginAt: null
        };
        await usersCol.insertOne(standardUser);
        console.log(`[Auth] Seeded standard user: ${userEmail}`);
        try {
          const { createTemplateSetForNewUser: createTemplateSetForNewUser2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
          await createTemplateSetForNewUser2(standardUser.id, standardUser.name);
        } catch {
        }
      } else {
        const userHash = await hashPassword(userPasswordRaw);
        await usersCol.updateOne(
          { email: userEmail },
          { $set: { passwordHash: userHash, isActive: true } }
        );
      }
    }
  } catch (err) {
    console.error("[Auth] Error seeding initial users:", err);
  }
}
var SESSION_DURATION_MS, SESSION_COOKIE_NAME, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS, LocalAuthProvider;
var init_auth = __esm({
  "server/auth.ts"() {
    init_mongodb();
    SESSION_DURATION_MS = 8 * 60 * 60 * 1e3;
    SESSION_COOKIE_NAME = "gini_auth_token";
    MAX_FAILED_ATTEMPTS = 5;
    LOCKOUT_DURATION_MS = 15 * 60 * 1e3;
    LocalAuthProvider = class {
      async authenticate(email, password) {
        if (!email || !password) return null;
        const cleanEmail = email.toLowerCase().trim();
        const db = await getDb();
        const userDoc = await db.collection("users").findOne({ email: cleanEmail });
        if (!userDoc) return null;
        const isValid = await verifyPassword(password, userDoc.passwordHash);
        if (!isValid) return null;
        return sanitizeUser(userDoc);
      }
    };
  }
});

// server/mongodb.ts
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import dns from "dns";
async function getMongoClient() {
  if (state.client && state.promise) {
    return state.promise;
  }
  if (state.promise) {
    return state.promise;
  }
  state.promise = (async () => {
    const rawUri = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
    const hasMongoUri = Boolean(rawUri && rawUri.length > 0);
    const uriLength = rawUri.length;
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    const isDevelopment = !isProduction && (process.env.NODE_ENV === "development" || !process.env.NODE_ENV || process.env.NODE_ENV === "test");
    console.log("[MongoDB Diagnostics] ==========================================");
    console.log("[MongoDB Diagnostics] Connection attempt started.");
    console.log('[MongoDB Diagnostics] Step 1: Package "mongodb" module loaded:', isMongoPackageLoaded);
    console.log("[MongoDB Diagnostics] Step 2: Runtime environment inspection:", {
      hasMongoUri,
      uriLength,
      NODE_ENV: process.env.NODE_ENV || "(unset)",
      VERCEL: process.env.VERCEL || "(unset)",
      VERCEL_ENV: process.env.VERCEL_ENV || "(unset)",
      isProduction,
      isDevelopment
    });
    let uri = rawUri;
    let source = "none";
    if (uri) {
      if (/:\s*@/.test(uri)) {
        state.uriSource = "none";
        const emptyPassErr = new Error("Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/...");
        emptyPassErr.code = "ERR_EMPTY_PASSWORD";
        state.lastError = {
          name: emptyPassErr.name,
          message: emptyPassErr.message,
          code: "ERR_EMPTY_PASSWORD",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        throw emptyPassErr;
      }
      source = "env_uri";
      console.log(`[MongoDB Diagnostics] MONGODB_URI detected in environment (Length: ${uriLength} chars). Connecting via env URI.`);
    } else if (isDevelopment) {
      console.log("[MongoDB Diagnostics] MONGODB_URI not detected. Local development detected: attempting MongoMemoryServer fallback...");
      try {
        const memPackage = "mongodb-memory-server";
        const { MongoMemoryServer } = await import(memPackage);
        if (!state.memoryServer) {
          state.memoryServer = await MongoMemoryServer.create({
            instance: { dbName: "outreach_flow" }
          });
        }
        uri = state.memoryServer.getUri();
        source = "memory_server";
        console.log(`[MongoDB Diagnostics] Initialized local dev memory server at: ${uri}`);
      } catch (err) {
        console.warn("[MongoDB Diagnostics] MongoMemoryServer not available in development:", err.message);
      }
    } else {
      console.error("[MongoDB Diagnostics] CRITICAL: Running in production/Vercel but MONGODB_URI is missing or empty!");
    }
    if (!uri) {
      state.uriSource = "none";
      const missingUriErr = new Error("MONGODB_URI environment variable is required to connect to MongoDB in production.");
      missingUriErr.code = "ERR_MISSING_MONGODB_URI";
      state.lastError = {
        name: missingUriErr.name,
        message: missingUriErr.message,
        code: "ERR_MISSING_MONGODB_URI",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      throw missingUriErr;
    }
    state.uriSource = source;
    const dbName = process.env.MONGODB_DB_NAME || "outreach_flow";
    console.log(`[MongoDB Diagnostics] Step 3: Instantiating MongoClient for database: "${dbName}"...`);
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5e3,
      connectTimeoutMS: 1e4
    });
    try {
      console.log("[MongoDB Diagnostics] Step 4: Calling client.connect()...");
      await client.connect();
      state.client = client;
      state.db = client.db(dbName);
      state.lastError = void 0;
      console.log(`[MongoDB Diagnostics] SUCCESS: Connected successfully to MongoDB database: "${dbName}" (source: ${source})`);
      await ensureIndexesAndSeed(state.db);
      return client;
    } catch (err) {
      console.error("[MongoDB Diagnostics] FAILED: client.connect() encountered an error!");
      console.error("[MongoDB Diagnostics] Error Name:", err?.name);
      console.error("[MongoDB Diagnostics] Error Message:", err?.message);
      console.error("[MongoDB Diagnostics] Error Code:", err?.code);
      console.error("[MongoDB Diagnostics] Error CodeName:", err?.codeName);
      if (err?.stack) {
        console.error("[MongoDB Diagnostics] Stack Trace:", err.stack);
      }
      state.lastError = {
        name: err?.name || "Error",
        message: err?.message || "Unknown connection error",
        code: err?.code,
        codeName: err?.codeName,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.promise = null;
      throw err;
    } finally {
      console.log("[MongoDB Diagnostics] ==========================================");
    }
  })().catch((err) => {
    state.promise = null;
    throw err;
  });
  return state.promise;
}
async function getDb() {
  if (state.db) {
    return state.db;
  }
  await getMongoClient();
  if (!state.db) {
    throw new Error("Failed to obtain MongoDB Db instance.");
  }
  return state.db;
}
async function ensureIndexesAndSeed(db) {
  try {
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const tasksCol = db.collection(COLLECTIONS.TASKS);
    const sendersCol = db.collection(COLLECTIONS.SENDERS);
    const settingsCol = db.collection(COLLECTIONS.SETTINGS);
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    const usersCol = db.collection(COLLECTIONS.USERS);
    const lockoutsCol = db.collection(COLLECTIONS.AUTH_LOCKOUTS);
    const notesCol = db.collection(COLLECTIONS.USER_WORKSPACE_NOTES);
    const alertStatesCol = db.collection(COLLECTIONS.USER_ALERT_STATES);
    await Promise.all([
      leadsCol.createIndex({ leadId: 1 }, { unique: true, name: "idx_leads_leadId_unique" }).catch(() => {
      }),
      leadsCol.createIndex({ email: 1 }, { name: "idx_leads_email" }).catch(() => {
      }),
      leadsCol.createIndex({ campaignId: 1 }, { name: "idx_leads_campaignId" }).catch(() => {
      }),
      leadsCol.createIndex({ ownerId: 1 }, { name: "idx_leads_ownerId" }).catch(() => {
      }),
      campaignsCol.createIndex({ id: 1 }, { unique: true, name: "idx_campaigns_id_unique" }).catch(() => {
      }),
      campaignsCol.createIndex({ ownerId: 1 }, { name: "idx_campaigns_ownerId" }).catch(() => {
      }),
      tasksCol.createIndex({ id: 1 }, { unique: true, name: "idx_tasks_id_unique" }).catch(() => {
      }),
      sendersCol.createIndex({ id: 1 }, { unique: true, name: "idx_senders_id_unique" }).catch(() => {
      }),
      settingsCol.createIndex({ id: 1 }, { unique: true, name: "idx_settings_id_unique" }).catch(() => {
      }),
      eventsCol.createIndex({ id: 1 }, { unique: true, name: "idx_events_id_unique" }).catch(() => {
      }),
      eventsCol.createIndex({ leadId: 1 }, { name: "idx_events_leadId" }).catch(() => {
      }),
      eventsCol.createIndex({ email: 1 }, { name: "idx_events_email" }).catch(() => {
      }),
      usersCol.createIndex({ email: 1 }, { unique: true, name: "idx_users_email_unique" }).catch(() => {
      }),
      usersCol.createIndex({ id: 1 }, { unique: true, name: "idx_users_id_unique" }).catch(() => {
      }),
      lockoutsCol.createIndex({ key: 1 }, { unique: true, name: "idx_lockouts_key_unique" }).catch(() => {
      }),
      notesCol.createIndex({ userId: 1 }, { unique: true, name: "idx_notes_userId_unique" }).catch(() => {
      }),
      alertStatesCol.createIndex({ userId: 1 }, { unique: true, name: "idx_alerts_userId_unique" }).catch(() => {
      })
    ]);
    if (!state.isSeeded) {
      await autoSeedFromLocalData(db);
      try {
        const { seedInitialUsers: seedInitialUsers2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
        await seedInitialUsers2();
      } catch (authSeedErr) {
        console.warn("[MongoDB] Auth seed notice:", authSeedErr);
      }
      state.isSeeded = true;
    }
    await backfillOwnership(db);
    try {
      const { ensureTemplateSetsAndSeed: ensureTemplateSetsAndSeed2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
      await ensureTemplateSetsAndSeed2();
    } catch (tmplErr) {
      console.warn("[MongoDB] Template sets seed notice:", tmplErr);
    }
  } catch (err) {
    console.error("[MongoDB] Error during index creation or seeding:", err);
  }
}
async function backfillOwnership(db) {
  try {
    const usersCol = db.collection(COLLECTIONS.USERS);
    const firstAdmin = await usersCol.findOne(
      { role: "admin", isActive: true },
      { sort: { createdAt: 1 } }
    );
    if (!firstAdmin) {
      return { leadsUpdated: 0, campaignsUpdated: 0 };
    }
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const unownedLeadsFilter = {
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null },
        { ownerId: "" }
      ]
    };
    const leadResult = await leadsCol.updateMany(unownedLeadsFilter, {
      $set: { ownerId: firstAdmin.id, ownerName: firstAdmin.name }
    });
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const unownedCampaignsFilter = {
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null },
        { ownerId: "" }
      ]
    };
    const campaignResult = await campaignsCol.updateMany(unownedCampaignsFilter, {
      $set: { ownerId: firstAdmin.id, ownerName: firstAdmin.name }
    });
    if (leadResult.modifiedCount > 0 || campaignResult.modifiedCount > 0) {
      console.log(`[Backfill] Backfilled ${leadResult.modifiedCount} leads and ${campaignResult.modifiedCount} campaigns to admin ${firstAdmin.email}`);
    }
    return {
      leadsUpdated: leadResult.modifiedCount,
      campaignsUpdated: campaignResult.modifiedCount
    };
  } catch (err) {
    console.error("[Backfill] Error in backfillOwnership:", err);
    return { leadsUpdated: 0, campaignsUpdated: 0 };
  }
}
async function autoSeedFromLocalData(db) {
  const result = {
    leads: 0,
    campaigns: 0,
    tasks: 0,
    senders: 0,
    settings: 0,
    trackingEvents: 0
  };
  const dataDir = path.join(process.cwd(), "data_store");
  const trackingFile = path.join(process.cwd(), "tracking-events.json");
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const existingCampaignsCount = await campaignsCol.countDocuments();
  if (existingCampaignsCount === 0) {
    const campFile = path.join(dataDir, "campaigns.json");
    if (fs.existsSync(campFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(campFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((c) => ({
            updateOne: {
              filter: { id: c.id },
              update: {
                $set: {
                  ...c,
                  is_active: Boolean(c.is_active ?? c.isActive),
                  workflow_graph: c.workflow_graph || { nodes: c.nodes || [], edges: c.edges || [] },
                  updated_date: c.updated_date || (/* @__PURE__ */ new Date()).toISOString()
                }
              },
              upsert: true
            }
          }));
          await campaignsCol.bulkWrite(ops);
          result.campaigns = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} campaigns from data_store/campaigns.json`);
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse campaigns.json for seeding:", e.message);
      }
    }
  }
  const sendersCol = db.collection(COLLECTIONS.SENDERS);
  const existingSendersCount = await sendersCol.countDocuments();
  if (existingSendersCount === 0) {
    const sendersFile = path.join(dataDir, "senders.json");
    if (fs.existsSync(sendersFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(sendersFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((s) => ({
            updateOne: {
              filter: { id: s.id },
              update: {
                $set: {
                  ...s,
                  provider: s.provider || "outlook"
                  // Default email provider is Outlook
                }
              },
              upsert: true
            }
          }));
          await sendersCol.bulkWrite(ops);
          result.senders = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} senders from data_store/senders.json`);
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse senders.json for seeding:", e.message);
      }
    }
  }
  const tasksCol = db.collection(COLLECTIONS.TASKS);
  const existingTasksCount = await tasksCol.countDocuments();
  if (existingTasksCount === 0) {
    const tasksFile = path.join(dataDir, "tasks.json");
    if (fs.existsSync(tasksFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tasksFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((t) => ({
            updateOne: {
              filter: { id: t.id },
              update: { $set: t },
              upsert: true
            }
          }));
          await tasksCol.bulkWrite(ops);
          result.tasks = raw.length;
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse tasks.json for seeding:", e.message);
      }
    }
  }
  const settingsCol = db.collection(COLLECTIONS.SETTINGS);
  const existingSettingsCount = await settingsCol.countDocuments();
  if (existingSettingsCount === 0) {
    const settingsFile = path.join(dataDir, "settings.json");
    let settingsDoc = {
      id: "app_settings",
      spreadsheetId: "",
      spreadsheetName: "Outreach Flow CRM",
      spreadsheetUrl: "",
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: "Outreach Flow",
      senderEmail: "connect@giniiris.ai",
      appName: "Outreach Flow",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (fs.existsSync(settingsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
        settingsDoc = { ...settingsDoc, ...raw, id: "app_settings" };
      } catch {
      }
    }
    await settingsCol.updateOne(
      { id: "app_settings" },
      { $set: settingsDoc },
      { upsert: true }
    );
    result.settings = 1;
  }
  const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
  const existingEventsCount = await eventsCol.countDocuments();
  if (existingEventsCount === 0 && fs.existsSync(trackingFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(trackingFile, "utf-8"));
      if (Array.isArray(raw) && raw.length > 0) {
        const ops = raw.map((ev) => ({
          updateOne: {
            filter: { id: ev.id },
            update: { $set: ev },
            upsert: true
          }
        }));
        await eventsCol.bulkWrite(ops);
        result.trackingEvents = raw.length;
        console.log(`[MongoDB] Auto-seeded ${raw.length} tracking events from tracking-events.json`);
      }
    } catch (e) {
      console.warn("[MongoDB] Failed to parse tracking-events.json for seeding:", e.message);
    }
  }
  return { seeded: true, counts: result };
}
async function getMongoStatus() {
  try {
    const db = await getDb();
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const tasksCol = db.collection(COLLECTIONS.TASKS);
    const sendersCol = db.collection(COLLECTIONS.SENDERS);
    const settingsCol = db.collection(COLLECTIONS.SETTINGS);
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    const [leads, campaigns, tasks, senders, settings, trackingEvents] = await Promise.all([
      leadsCol.countDocuments().catch(() => 0),
      campaignsCol.countDocuments().catch(() => 0),
      tasksCol.countDocuments().catch(() => 0),
      sendersCol.countDocuments().catch(() => 0),
      settingsCol.countDocuments().catch(() => 0),
      eventsCol.countDocuments().catch(() => 0)
    ]);
    return {
      connected: true,
      status: "connected",
      database: db.databaseName,
      source: state.uriSource,
      counts: {
        leads,
        campaigns,
        tasks,
        senders,
        settings,
        trackingEvents
      },
      diagnostics: {
        mongoPackageLoaded: isMongoPackageLoaded,
        hasMongoUri: Boolean((process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim().length > 0),
        uriLength: (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim().length,
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL === "1")
      }
    };
  } catch (err) {
    const effectiveUri = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
    const hasMongoUri = Boolean(effectiveUri.length > 0);
    return {
      connected: false,
      status: "error",
      database: "",
      source: state.uriSource,
      error: err.message || "Unable to connect to MongoDB",
      diagnostics: {
        mongoPackageLoaded: isMongoPackageLoaded,
        hasMongoUri,
        uriLength: effectiveUri.length,
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL === "1"),
        errorName: err?.name || state.lastError?.name,
        errorCode: err?.code || state.lastError?.code,
        errorMessage: err?.message || state.lastError?.message
      }
    };
  }
}
async function updateMongoUri(newUri) {
  const trimmed = newUri.trim();
  if (!trimmed) {
    return { success: false, error: "URI cannot be empty" };
  }
  if (/:\s*@/.test(trimmed)) {
    return {
      success: false,
      error: "Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/..."
    };
  }
  const testClient = new MongoClient(trimmed, {
    serverSelectionTimeoutMS: 5e3,
    connectTimeoutMS: 5e3
  });
  try {
    await testClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || "outreach_flow";
    const testDb = testClient.db(dbName);
    await testDb.command({ ping: 1 });
    await testDb.collection("settings").findOne({});
    if (state.client) {
      try {
        await state.client.close();
      } catch {
      }
    }
    state.client = testClient;
    state.db = testDb;
    state.promise = Promise.resolve(testClient);
    state.uriSource = "env_uri";
    state.lastError = void 0;
    process.env.MONGODB_URI = trimmed;
    try {
      const envPath = path.join(process.cwd(), ".env");
      fs.writeFileSync(envPath, `MONGODB_URI="${trimmed}"
MONGODB_DB_NAME="${dbName}"
`, "utf-8");
    } catch (e) {
      console.warn("Could not write to .env:", e);
    }
    await ensureIndexesAndSeed(testDb);
    return { success: true, database: dbName };
  } catch (err) {
    try {
      await testClient.close();
    } catch {
    }
    return {
      success: false,
      error: err.message || "Connection failed",
      code: err.code
    };
  }
}
var DEFAULT_MONGODB_URI, isMongoPackageLoaded, COLLECTIONS, state;
var init_mongodb = __esm({
  "server/mongodb.ts"() {
    dotenv.config({ override: true });
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (_) {
    }
    DEFAULT_MONGODB_URI = "mongodb+srv://sahhityanaresh_db_user:test12345678@cluster0.zebcge8.mongodb.net/?appName=Cluster0";
    isMongoPackageLoaded = typeof MongoClient === "function";
    console.log(`[MongoDB Diagnostics] Step 1: Package "mongodb" module import check: ${isMongoPackageLoaded ? "SUCCESS (MongoClient constructor is loaded)" : "FAILED"}`);
    COLLECTIONS = {
      LEADS: "leads",
      CAMPAIGNS: "campaigns",
      TASKS: "tasks",
      SENDERS: "senders",
      SETTINGS: "settings",
      TRACKING_EVENTS: "trackingEvents",
      GRAPH_SUBSCRIPTIONS: "graph_subscriptions",
      INBOUND_REPLIES: "inbound_replies",
      USERS: "users",
      AUTH_LOCKOUTS: "auth_lockouts",
      USER_WORKSPACE_NOTES: "user_workspace_notes",
      USER_ALERT_STATES: "user_alert_states",
      TEMPLATE_SETS: "templateSets"
    };
    state = global.__mongoGlobalState || {
      client: null,
      promise: null,
      db: null,
      uriSource: "none",
      isSeeded: false
    };
    if (!global.__mongoGlobalState) {
      global.__mongoGlobalState = state;
    }
  }
});

// server/replyRules.ts
function validatePhrase(phrase, existingList = []) {
  if (typeof phrase !== "string") {
    return { valid: false, normalized: "", error: "Phrase must be a string" };
  }
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return { valid: false, normalized: "", error: "Phrase cannot be empty" };
  }
  if (normalized.length < 2 || normalized.length > 80) {
    return { valid: false, normalized, error: "Phrase length must be between 2 and 80 characters" };
  }
  const isDuplicate = existingList.some((item) => item.trim().toLowerCase().replace(/\s+/g, " ") === normalized);
  if (isDuplicate) {
    return { valid: false, normalized, error: `Phrase "${normalized}" already exists in this list (case-insensitive duplicate)` };
  }
  let warning;
  const words = normalized.split(/\s+/);
  if (words.length === 1 && COMMON_SHORT_WORDS.has(normalized)) {
    warning = `"${normalized}" is a single very common word. It may match unintended replies (e.g. in casual phrasing). Are you sure you want to add it?`;
  }
  return { valid: true, normalized, warning };
}
async function getActiveKeywords(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedKeywords && now < cacheExpiryTime) {
    return cachedKeywords;
  }
  try {
    const db = await getDb();
    const col = db.collection(COLLECTIONS.SETTINGS);
    let doc = await col.findOne({ id: "reply_keywords" });
    if (!doc) {
      const seedDoc = {
        id: "reply_keywords",
        autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
        deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
        negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
        positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await col.updateOne({ id: "reply_keywords" }, { $set: seedDoc }, { upsert: true });
      doc = seedDoc;
    }
    cachedKeywords = {
      autoReplyPhrases: Array.isArray(doc.autoReplyPhrases) ? doc.autoReplyPhrases : [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: Array.isArray(doc.deferralPhrases) ? doc.deferralPhrases : [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: Array.isArray(doc.negativePhrases) ? doc.negativePhrases : [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: Array.isArray(doc.positivePhrases) ? doc.positivePhrases : [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
    cacheExpiryTime = now + CACHE_TTL_MS;
    return cachedKeywords;
  } catch (err) {
    console.warn("Failed to load active keywords from MongoDB, using built-in defaults:", err);
    return {
      autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
  }
}
async function saveActiveKeywords(lists) {
  const current = await getActiveKeywords(true);
  const updated = {
    autoReplyPhrases: lists.autoReplyPhrases || current.autoReplyPhrases,
    deferralPhrases: lists.deferralPhrases || current.deferralPhrases,
    negativePhrases: lists.negativePhrases || current.negativePhrases,
    positivePhrases: lists.positivePhrases || current.positivePhrases
  };
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SETTINGS);
  await col.updateOne(
    { id: "reply_keywords" },
    {
      $set: {
        id: "reply_keywords",
        ...updated,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    },
    { upsert: true }
  );
  cachedKeywords = { ...updated };
  cacheExpiryTime = Date.now() + CACHE_TTL_MS;
  return cachedKeywords;
}
async function resetKeywordsToDefault(category) {
  const current = await getActiveKeywords(true);
  let updated;
  if (!category || category === "all") {
    updated = {
      autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
  } else {
    updated = {
      ...current,
      [category]: [...DEFAULT_KEYWORD_LISTS[category]]
    };
  }
  return await saveActiveKeywords(updated);
}
function cleanReplyText(text) {
  if (!text || typeof text !== "string") return "";
  const lines = text.split(/\r?\n/);
  const keptLines = [];
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (trimmed.startsWith(">") || trimmed.startsWith("&gt;") || trimmed.startsWith("|")) {
      continue;
    }
    if (/^on\s.+wrote:$/i.test(trimmed) || /^on\s.+at\s.+wrote:$/i.test(trimmed) || /^-----original message-----/i.test(trimmed) || /^-----forwarded message-----/i.test(trimmed) || /^________________________________/i.test(trimmed) || /^from:\s*.+$/i.test(trimmed)) {
      break;
    }
    if (/^sent from my (iphone|ipad|android|galaxy|pixel|phone)/i.test(trimmed) || /^sent with re\/max/i.test(trimmed) || /^get outlook for (ios|android)/i.test(trimmed) || trimmed === "--" || trimmed === "-- ") {
      break;
    }
    keptLines.push(rawLine);
  }
  let cleaned = keptLines.join("\n").trim();
  cleaned = cleaned.replace(/on\s+[\s\S]+?wrote:[\s\S]*$/i, "").trim();
  return cleaned;
}
function isNegatedAtPosition(text, matchIndex) {
  const precedingText = text.substring(0, matchIndex).trim();
  const words = precedingText.split(/\s+/).filter(Boolean);
  const precedingWords = words.slice(-3);
  const negationRegex = /\b(not|never|no|hardly|scarcely|neither|nor)\b|n['’]t$/i;
  return precedingWords.some((w) => negationRegex.test(w));
}
function buildPhraseRegex(phrase) {
  const lower = phrase.trim().toLowerCase();
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startBoundary = /^\w/.test(lower) ? "\\b" : "(?:^|\\s|[^\\w])";
  const endBoundary = /\w$/.test(lower) ? "\\b" : "(?=$|\\s|[^\\w])";
  return new RegExp(`${startBoundary}${escaped}${endBoundary}`, "gi");
}
function findMatchingPhrases(text, phraseList) {
  const matches = [];
  const lowerText = text.toLowerCase();
  for (const phrase of phraseList) {
    if (!phrase || !phrase.trim()) continue;
    const regex = buildPhraseRegex(phrase);
    let m;
    while ((m = regex.exec(lowerText)) !== null) {
      matches.push({ phrase, index: m.index });
    }
  }
  return matches;
}
function classifyReply(subject, body, keywordOverrides) {
  const keywords = keywordOverrides || cachedKeywords || DEFAULT_KEYWORD_LISTS;
  const cleanSub = (subject || "").trim();
  const cleanBodyText = cleanReplyText(body || "");
  const combinedText = `${cleanSub}
${cleanBodyText}`.toLowerCase();
  const autoMatches = findMatchingPhrases(combinedText, keywords.autoReplyPhrases);
  const matchedAutoPhrases = Array.from(new Set(autoMatches.map((m) => m.phrase)));
  if (matchedAutoPhrases.length > 0) {
    return {
      sentiment: "neutral",
      confidence: 1,
      matchedPhrases: matchedAutoPhrases,
      reason: `Auto-reply / system notice detected: ${matchedAutoPhrases.slice(0, 3).join(", ")}`,
      isAutoReply: true
    };
  }
  if (!cleanBodyText && !cleanSub) {
    return {
      sentiment: "neutral",
      confidence: 0.5,
      matchedPhrases: [],
      reason: "Empty reply content"
    };
  }
  const deferralMatches = findMatchingPhrases(cleanBodyText, keywords.deferralPhrases);
  const matchedDeferrals = Array.from(new Set(deferralMatches.map((m) => m.phrase)));
  const negativeMatches = findMatchingPhrases(cleanBodyText, keywords.negativePhrases);
  const validNegativePhrases = [];
  for (const match of negativeMatches) {
    if (match.phrase === "not interested") {
      const snippetAfter = cleanBodyText.substring(match.index + match.phrase.length, match.index + match.phrase.length + 20).toLowerCase();
      if (/^\s+in\s+(waiting|delaying|postponing|holding)/i.test(snippetAfter)) {
        continue;
      }
    }
    validNegativePhrases.push(match.phrase);
  }
  const matchedNegatives = Array.from(new Set(validNegativePhrases));
  const positiveMatches = findMatchingPhrases(cleanBodyText, keywords.positivePhrases);
  const survivingPositives = [];
  for (const match of positiveMatches) {
    const isNegated = isNegatedAtPosition(cleanBodyText, match.index);
    if (!isNegated) {
      survivingPositives.push(match.phrase);
    }
  }
  const matchedPositives = Array.from(new Set(survivingPositives));
  if (matchedNegatives.length > 0 && matchedPositives.length === 0) {
    return {
      sentiment: "negative",
      confidence: 0.95,
      matchedPhrases: matchedNegatives,
      reason: `Negative phrase(s) detected: ${matchedNegatives.join(", ")}`
    };
  }
  if (matchedPositives.length > 0 && matchedNegatives.length === 0 && matchedDeferrals.length === 0) {
    return {
      sentiment: "positive",
      confidence: 0.95,
      matchedPhrases: matchedPositives,
      reason: `Positive phrase(s) detected: ${matchedPositives.join(", ")}`
    };
  }
  if (matchedDeferrals.length > 0 && matchedPositives.length === 0) {
    return {
      sentiment: "neutral",
      confidence: 0.85,
      matchedPhrases: matchedDeferrals,
      reason: `Deferral / timing phrase detected: ${matchedDeferrals.join(", ")}`
    };
  }
  if (matchedPositives.length > 0 && (matchedNegatives.length > 0 || matchedDeferrals.length > 0)) {
    const allMatches = [...matchedPositives, ...matchedNegatives, ...matchedDeferrals];
    return {
      sentiment: "neutral",
      confidence: 0.6,
      matchedPhrases: allMatches,
      reason: `Mixed signals detected: positive (${matchedPositives.join(", ")}), negative/deferral (${[...matchedNegatives, ...matchedDeferrals].join(", ")})`
    };
  }
  return {
    sentiment: "neutral",
    confidence: 0.5,
    matchedPhrases: [],
    reason: "No conclusive positive or negative sentiment phrases detected"
  };
}
function normalizeCompanyName(company) {
  if (!company) return "";
  let norm = company.toLowerCase().trim();
  norm = norm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, " ");
  const suffixes = [
    "inc",
    "incorporated",
    "ltd",
    "limited",
    "llc",
    "pvt",
    "private",
    "corp",
    "corporation",
    "co",
    "company",
    "gmbh",
    "sa",
    "sarl",
    "bv",
    "pty"
  ];
  const regex = new RegExp(`\\b(${suffixes.join("|")})\\b`, "gi");
  norm = norm.replace(regex, " ");
  norm = norm.replace(/\s+/g, " ").trim();
  return norm;
}
function extractCompanyDomain(email) {
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1].trim().toLowerCase();
  if (FREE_EMAIL_PROVIDERS.has(domain)) return "";
  return domain;
}
function areSameCompany(leadA, leadB) {
  const normA = normalizeCompanyName(leadA.company);
  const normB = normalizeCompanyName(leadB.company);
  if (normA && normB && normA === normB) {
    return true;
  }
  const domA = extractCompanyDomain(leadA.email);
  const domB = extractCompanyDomain(leadB.email);
  if (domA && domB && domA === domB) {
    return true;
  }
  return false;
}
var AUTO_REPLY_PHRASES, DEFERRAL_PHRASES, STRONG_NEGATIVE_PHRASES, STRONG_POSITIVE_PHRASES, DEFAULT_KEYWORD_LISTS, COMMON_SHORT_WORDS, cachedKeywords, cacheExpiryTime, CACHE_TTL_MS, FREE_EMAIL_PROVIDERS;
var init_replyRules = __esm({
  "server/replyRules.ts"() {
    init_mongodb();
    AUTO_REPLY_PHRASES = [
      "out of office",
      "out of the office",
      "automatic reply",
      "auto-reply",
      "auto reply",
      "autoreply",
      "automated response",
      "on vacation",
      "annual leave",
      "maternity leave",
      "paternity leave",
      "undeliverable",
      "delivery failure",
      "delivery status notification",
      "failure notice",
      "mailer-daemon",
      "mail delivery subsystem",
      "i am away",
      "currently away",
      "away from my desk",
      "away from the office",
      "no longer with the company",
      "no longer works at",
      "no longer work at",
      "has left the company",
      "mailbox is full",
      "undelivered mail",
      "system administrator",
      "this is an automated message"
    ];
    DEFERRAL_PHRASES = [
      "not now",
      "maybe later",
      "next quarter",
      "circle back",
      "reach out in",
      "not at this time",
      "bad timing",
      "check back in",
      "follow up next",
      "ping me in",
      "touch base next quarter",
      "revisit this in",
      "revisit later",
      "busy right now",
      "swamped right now",
      "too busy at the moment",
      "touch base in",
      "reach out again in",
      "ping us in",
      "next year",
      "in a few months",
      "reach out next month"
    ];
    STRONG_NEGATIVE_PHRASES = [
      "unsubscribe",
      "remove me",
      "remove my email",
      "stop emailing",
      "stop sending",
      "do not contact",
      "don't contact",
      "don't email",
      "do not email",
      "take me off",
      "take us off",
      "opt out",
      "not interested",
      "no thanks",
      "no thank you",
      "no longer interested",
      "leave me alone",
      "please stop",
      "not a fit",
      "not relevant",
      "this is spam",
      "report spam",
      "reported as spam",
      "delete my info",
      "never contact",
      "cease and desist",
      "stop contacting",
      "wrong person",
      "not looking for"
    ];
    STRONG_POSITIVE_PHRASES = [
      "interested",
      "let's talk",
      "lets talk",
      "let's chat",
      "lets chat",
      "let's connect",
      "lets connect",
      "sounds good",
      "sounds great",
      "sounds interesting",
      "tell me more",
      "send me more info",
      "send more info",
      "send me more details",
      "send more details",
      "send me more pricing",
      "send pricing",
      "send over pricing",
      "schedule a call",
      "schedule a demo",
      "schedule a meeting",
      "book a call",
      "book a demo",
      "book a meeting",
      "book a time",
      "happy to chat",
      "happy to connect",
      "happy to talk",
      "would love to",
      "please call",
      "call me",
      "give me a call",
      "available on",
      "available this",
      "available next",
      "set up a call",
      "set up a time",
      "set up a meeting",
      "set up a demo",
      "let's do it",
      "free to chat",
      "free to talk",
      "send over a calendar",
      "send your calendar",
      "send your link",
      "yes"
    ];
    DEFAULT_KEYWORD_LISTS = {
      autoReplyPhrases: [...AUTO_REPLY_PHRASES],
      deferralPhrases: [...DEFERRAL_PHRASES],
      negativePhrases: [...STRONG_NEGATIVE_PHRASES],
      positivePhrases: [...STRONG_POSITIVE_PHRASES]
    };
    COMMON_SHORT_WORDS = /* @__PURE__ */ new Set([
      "no",
      "stop",
      "yes",
      "not",
      "ok",
      "okay",
      "thanks",
      "thank",
      "sure",
      "hi",
      "hello",
      "bye",
      "please",
      "help"
    ]);
    cachedKeywords = null;
    cacheExpiryTime = 0;
    CACHE_TTL_MS = 60 * 1e3;
    FREE_EMAIL_PROVIDERS = /* @__PURE__ */ new Set([
      "gmail.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "icloud.com",
      "aol.com",
      "live.com",
      "msn.com",
      "proton.me",
      "protonmail.com",
      "zoho.com",
      "yandex.com",
      "mail.com",
      "gmx.com"
    ]);
  }
});

// server/mongoBackend.ts
var mongoBackend_exports = {};
__export(mongoBackend_exports, {
  appendLeadNote: () => appendLeadNote,
  applyLeadReply: () => applyLeadReply,
  batchCreateLeads: () => batchCreateLeads,
  checkCampaignImpact: () => checkCampaignImpact,
  cleanLeadNotes: () => cleanLeadNotes,
  clearAllTrackingEvents: () => clearAllTrackingEvents,
  clearTaskAlertsState: () => clearTaskAlertsState,
  clearUserAlertsState: () => clearUserAlertsState,
  confirmCompanyPause: () => confirmCompanyPause,
  createLead: () => createLead,
  deleteCampaign: () => deleteCampaign,
  deleteLead: () => deleteLead,
  deleteLocalTask: () => deleteLocalTask,
  duplicateCampaign: () => duplicateCampaign,
  getNextLeadId: () => getNextLeadId,
  getSystemStatsSummary: () => getSystemStatsSummary,
  listCampaigns: () => listCampaigns,
  listLeads: () => listLeads,
  loadLocalSenders: () => loadLocalSenders,
  loadLocalSettings: () => loadLocalSettings,
  loadLocalTasks: () => loadLocalTasks,
  loadTaskAlertsState: () => loadTaskAlertsState,
  loadTrackingEvents: () => loadTrackingEvents,
  loadUserAlertsState: () => loadUserAlertsState,
  loadUserWorkspaceNotes: () => loadUserWorkspaceNotes,
  manualOverrideSentiment: () => manualOverrideSentiment,
  reassignAllLeads: () => reassignAllLeads,
  reassignLead: () => reassignLead,
  recordTrackingEvent: () => recordTrackingEvent,
  restoreCampaignVersion: () => restoreCampaignVersion,
  resumeCompanyLeads: () => resumeCompanyLeads,
  saveCampaign: () => saveCampaign,
  saveDismissedTaskAlerts: () => saveDismissedTaskAlerts,
  saveLocalSenders: () => saveLocalSenders,
  saveLocalSettings: () => saveLocalSettings,
  saveLocalTasks: () => saveLocalTasks,
  saveUserDismissedAlerts: () => saveUserDismissedAlerts,
  saveUserWorkspaceNotes: () => saveUserWorkspaceNotes,
  toggleCampaignActive: () => toggleCampaignActive,
  updateLead: () => updateLead,
  updateLocalTask: () => updateLocalTask
});
async function listLeads(token, spreadsheetId, queryFilter) {
  const db = await getDb();
  const filter = queryFilter || {};
  const leads = await db.collection(COLLECTIONS.LEADS).find(filter, { projection: { _id: 0 } }).toArray();
  const activeKeywords = await getActiveKeywords().catch(() => void 0);
  for (const l of leads) {
    let changed = false;
    const updatePayload = {};
    if ((l.hasReplied || l.status === "Replied" || l.status === "Negative Reply") && !l.replySentiment) {
      try {
        const cleanEmail = (l.email || "").trim().toLowerCase();
        const inb = await db.collection(COLLECTIONS.INBOUND_REPLIES).findOne({
          $or: [
            ...cleanEmail ? [{ leadEmail: cleanEmail }, { from: { $regex: cleanEmail, $options: "i" } }] : [],
            ...l.threadId ? [{ threadId: l.threadId }] : [],
            ...l.leadId ? [{ leadId: l.leadId }] : []
          ]
        });
        if (inb) {
          const classification = classifyReply(inb.subject, inb.body, activeKeywords);
          l.replySentiment = classification.sentiment;
          l.replyClassifiedBy = "auto";
          l.replyClassifiedAt = (/* @__PURE__ */ new Date()).toISOString();
          l.replyMatchedPhrases = classification.matchedPhrases;
          l.replyReason = classification.reason;
          updatePayload.replySentiment = l.replySentiment;
          updatePayload.replyClassifiedBy = l.replyClassifiedBy;
          updatePayload.replyClassifiedAt = l.replyClassifiedAt;
          updatePayload.replyMatchedPhrases = l.replyMatchedPhrases;
          updatePayload.replyReason = l.replyReason;
          if (classification.sentiment === "negative") {
            l.status = "Negative Reply";
            l.stoppedReason = "Negative reply received";
            updatePayload.status = "Negative Reply";
            updatePayload.stoppedReason = "Negative reply received";
          }
          changed = true;
        }
      } catch (_) {
      }
    }
    if (l.replySentiment === "negative" && l.status !== "Negative Reply") {
      l.status = "Negative Reply";
      l.stoppedReason = l.stoppedReason || "Negative reply received";
      updatePayload.status = "Negative Reply";
      updatePayload.stoppedReason = l.stoppedReason;
      changed = true;
    }
    if (changed && Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.collection(COLLECTIONS.LEADS).updateOne(
        { leadId: l.leadId },
        { $set: updatePayload }
      ).catch(() => {
      });
    }
  }
  return leads.map((l) => ({
    ...l,
    notes: cleanLeadNotes(l.notes),
    campaign: l.campaign && l.campaign.trim() ? l.campaign.trim() : "Default",
    campaignId: l.campaignId || ""
  }));
}
async function getNextLeadId() {
  const db = await getDb();
  const leads = await db.collection(COLLECTIONS.LEADS).find({}, { projection: { leadId: 1 } }).toArray();
  let maxNum = 100;
  for (const l of leads) {
    const match = String(l.leadId || "").match(/LEAD-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return `LEAD-${maxNum + 1}`;
}
async function createLead(leadData, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const cleanEmail = (leadData.email || "").trim().toLowerCase();
  const rawId = (leadData.leadId || "").trim();
  if (cleanEmail) {
    const existing = await col.findOne({ email: cleanEmail }, { projection: { _id: 0 } });
    if (existing) {
      if (requestingUser) {
        if (existing.ownerId && existing.ownerId !== requestingUser.id) {
          if (requestingUser.role !== "admin") {
            const err = new Error("This contact already exists in the system");
            err.status = 409;
            throw err;
          } else {
            const ownerLabel = existing.ownerName || existing.ownerId;
            const err = new Error(`This contact already exists in the system (owned by ${ownerLabel})`);
            err.status = 409;
            throw err;
          }
        }
      }
      const assignedOwnerId2 = existing.ownerId || (requestingUser?.role === "admin" ? leadData.ownerId || requestingUser.id : requestingUser?.id || "");
      const assignedOwnerName2 = existing.ownerName || (requestingUser?.role === "admin" ? leadData.ownerName || requestingUser.name : requestingUser?.name || "");
      const updatedDoc = {
        ...existing,
        ...leadData,
        leadId: existing.leadId,
        ownerId: assignedOwnerId2,
        ownerName: assignedOwnerName2,
        lastModifiedBy: requestingUser?.name || "System",
        currentStage: typeof leadData.currentStage === "number" ? leadData.currentStage : existing.currentStage || 0,
        status: leadData.status || existing.status || "Active",
        lastEmailSentDate: leadData.lastEmailSentDate || existing.lastEmailSentDate || "",
        nextSendDate: leadData.nextSendDate || existing.nextSendDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        threadId: leadData.threadId || existing.threadId || "",
        opensCount: typeof leadData.opensCount === "number" ? leadData.opensCount : existing.opensCount || 0,
        clicksCount: typeof leadData.clicksCount === "number" ? leadData.clicksCount : existing.clicksCount || 0,
        firstOpenedDate: leadData.firstOpenedDate || existing.firstOpenedDate || "",
        lastOpenedDate: leadData.lastOpenedDate || existing.lastOpenedDate || "",
        firstClickedDate: leadData.firstClickedDate || existing.firstClickedDate || "",
        lastClickedDate: leadData.lastClickedDate || existing.lastClickedDate || "",
        templateSource: leadData.templateSource || existing.templateSource || "campaign",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await col.updateOne({ leadId: existing.leadId }, { $set: updatedDoc });
      try {
        await db.collection(COLLECTIONS.TASKS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { leadEmail: { $regex: `^${cleanEmail}$`, $options: "i" } }
          ]
        });
        await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { email: { $regex: `^${cleanEmail}$`, $options: "i" } }
          ]
        });
      } catch (_) {
      }
      return updatedDoc;
    }
  }
  let finalLeadId = rawId;
  if (!finalLeadId || finalLeadId.includes("NaN") || finalLeadId.includes("undefined")) {
    finalLeadId = await getNextLeadId();
  }
  const existingById = await col.findOne({ leadId: finalLeadId });
  if (existingById) {
    finalLeadId = await getNextLeadId();
  }
  if (cleanEmail || finalLeadId) {
    try {
      const taskOr = [];
      const trackOr = [];
      const replyOr = [];
      if (finalLeadId) {
        taskOr.push({ leadId: finalLeadId });
        trackOr.push({ leadId: finalLeadId });
        replyOr.push({ leadId: finalLeadId });
      }
      if (cleanEmail) {
        taskOr.push({ leadEmail: { $regex: `^${cleanEmail}$`, $options: "i" } });
        trackOr.push({ email: { $regex: `^${cleanEmail}$`, $options: "i" } });
        replyOr.push({ leadEmail: { $regex: `^${cleanEmail}$`, $options: "i" } });
        replyOr.push({ from: { $regex: `^${cleanEmail}$`, $options: "i" } });
      }
      if (taskOr.length > 0) await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskOr });
      if (trackOr.length > 0) await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackOr });
      if (replyOr.length > 0) await db.collection(COLLECTIONS.INBOUND_REPLIES).deleteMany({ $or: replyOr });
    } catch (_) {
    }
  }
  const assignedOwnerId = requestingUser?.role === "admin" && leadData.ownerId ? leadData.ownerId : requestingUser?.id || leadData.ownerId || "";
  const assignedOwnerName = requestingUser?.role === "admin" && leadData.ownerName ? leadData.ownerName : requestingUser?.name || leadData.ownerName || "";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newLead = {
    leadId: finalLeadId,
    name: (leadData.name || "Prospect").trim(),
    email: (leadData.email || "").trim(),
    company: (leadData.company || "").trim(),
    painPoint: leadData.painPoint || "",
    currentStage: typeof leadData.currentStage === "number" ? leadData.currentStage : 0,
    status: leadData.status || "Active",
    lastEmailSentDate: leadData.lastEmailSentDate || "",
    nextSendDate: leadData.nextSendDate || now.split("T")[0],
    threadId: leadData.threadId || "",
    notes: leadData.notes || "",
    firstName: leadData.firstName || (leadData.name ? leadData.name.split(" ")[0] : ""),
    lastName: leadData.lastName || (leadData.name ? leadData.name.split(" ").slice(1).join(" ") : ""),
    jobTitle: leadData.jobTitle || "",
    linkedinUrl: leadData.linkedinUrl || "",
    industry: leadData.industry || "",
    campaign: leadData.campaign || "Default",
    opensCount: leadData.opensCount || 0,
    firstOpenedDate: leadData.firstOpenedDate || "",
    lastOpenedDate: leadData.lastOpenedDate || "",
    clicksCount: leadData.clicksCount || 0,
    firstClickedDate: leadData.firstClickedDate || "",
    lastClickedDate: leadData.lastClickedDate || "",
    currentNodeId: leadData.currentNodeId || "",
    campaignId: leadData.campaignId || "",
    nodeEnteredDate: leadData.nodeEnteredDate || "",
    senderUsed: leadData.senderUsed || "",
    ownerId: assignedOwnerId,
    ownerName: assignedOwnerName,
    lastModifiedBy: requestingUser?.name || "System",
    templateSource: leadData.templateSource || "campaign",
    createdAt: now,
    updatedAt: now
  };
  if (!newLead.campaignId && newLead.campaign && newLead.campaign !== "Default") {
    const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
      name: { $regex: new RegExp(`^${newLead.campaign.trim()}$`, "i") }
    });
    if (matchedCamp && (matchedCamp.id || matchedCamp._id)) {
      newLead.campaignId = matchedCamp.id || String(matchedCamp._id);
    }
  }
  await col.insertOne({ ...newLead });
  return newLead;
}
async function updateLead(leadData, token, spreadsheetId, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  if (!leadData.leadId) {
    throw new Error("updateLead requires leadId");
  }
  const existing = await col.findOne({ leadId: leadData.leadId }, { projection: { _id: 0 } });
  if (!existing) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }
  if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }
  const payload = {
    ...leadData
  };
  if (requestingUser && requestingUser.role !== "admin") {
    delete payload.ownerId;
    delete payload.ownerName;
  }
  const updated = {
    ...existing,
    ...payload,
    notes: cleanLeadNotes(payload.notes !== void 0 ? payload.notes : existing.notes),
    lastModifiedBy: requestingUser?.name || existing.lastModifiedBy || "System",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if ((existing.replySentiment === "negative" || payload.replySentiment === "negative") && updated.status === "Replied") {
    updated.status = "Negative Reply";
    updated.replySentiment = "negative";
  } else if (updated.status === "Negative Reply" && !updated.replySentiment) {
    updated.replySentiment = "negative";
  }
  await col.updateOne({ leadId: leadData.leadId }, { $set: updated });
  return updated;
}
async function deleteLead(leadId, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const cleanId = leadId.trim();
  const existing = await col.findOne({ leadId: cleanId });
  if (!existing) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }
  if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }
  const leadEmail = existing.email?.trim().toLowerCase();
  const result = await col.deleteOne({ leadId: cleanId });
  try {
    const taskFilters = [
      { leadId: cleanId },
      { id: { $regex: cleanId, $options: "i" } }
    ];
    if (leadEmail) {
      taskFilters.push({ leadEmail: { $regex: `^${leadEmail}$`, $options: "i" } });
    }
    await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskFilters });
  } catch (_) {
  }
  try {
    const trackingFilters = [
      { leadId: cleanId }
    ];
    if (leadEmail) {
      trackingFilters.push({ email: { $regex: `^${leadEmail}$`, $options: "i" } });
    }
    await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackingFilters });
  } catch (_) {
  }
  try {
    const replyFilters = [
      { leadId: cleanId }
    ];
    if (leadEmail) {
      replyFilters.push({ leadEmail: { $regex: `^${leadEmail}$`, $options: "i" } });
      replyFilters.push({ from: { $regex: `^${leadEmail}$`, $options: "i" } });
    }
    await db.collection(COLLECTIONS.INBOUND_REPLIES).deleteMany({ $or: replyFilters });
  } catch (_) {
  }
  return result.deletedCount > 0;
}
async function batchCreateLeads(leadsData, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const createdOrUpdated = [];
  const allLeads = await col.find({}, { projection: { leadId: 1, email: 1, ownerId: 1, ownerName: 1 } }).toArray();
  let maxNum = 100;
  const existingEmailMap = /* @__PURE__ */ new Map();
  for (const l of allLeads) {
    if (l.email) existingEmailMap.set(l.email.trim().toLowerCase(), { leadId: l.leadId, ownerId: l.ownerId, ownerName: l.ownerName });
    const m = String(l.leadId || "").match(/LEAD-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of leadsData) {
    const cleanEmail = (item.email || "").trim().toLowerCase();
    const existing = cleanEmail ? existingEmailMap.get(cleanEmail) : void 0;
    if (existing && requestingUser) {
      if (existing.ownerId && existing.ownerId !== requestingUser.id) {
        continue;
      }
    }
    let targetLeadId = existing?.leadId || (item.leadId || "").trim();
    if (!targetLeadId || targetLeadId.includes("NaN") || targetLeadId.includes("undefined")) {
      maxNum++;
      targetLeadId = `LEAD-${maxNum}`;
    }
    const assignedOwnerId = requestingUser?.role === "admin" && item.ownerId ? item.ownerId : requestingUser?.id || item.ownerId || "";
    const assignedOwnerName = requestingUser?.role === "admin" && item.ownerName ? item.ownerName : requestingUser?.name || item.ownerName || "";
    const leadDoc = {
      leadId: targetLeadId,
      name: (item.name || "Prospect").trim(),
      email: (item.email || "").trim(),
      company: (item.company || "").trim(),
      painPoint: item.painPoint || "",
      currentStage: typeof item.currentStage === "number" ? item.currentStage : 0,
      status: item.status || "Active",
      lastEmailSentDate: item.lastEmailSentDate || "",
      nextSendDate: item.nextSendDate || now.split("T")[0],
      threadId: item.threadId || "",
      notes: item.notes || "",
      firstName: item.firstName || (item.name ? item.name.split(" ")[0] : ""),
      lastName: item.lastName || (item.name ? item.name.split(" ").slice(1).join(" ") : ""),
      jobTitle: item.jobTitle || "",
      linkedinUrl: item.linkedinUrl || "",
      industry: item.industry || "",
      campaign: item.campaign || "Default",
      opensCount: item.opensCount || 0,
      firstOpenedDate: item.firstOpenedDate || "",
      lastOpenedDate: item.lastOpenedDate || "",
      clicksCount: item.clicksCount || 0,
      firstClickedDate: item.firstClickedDate || "",
      lastClickedDate: item.lastClickedDate || "",
      currentNodeId: item.currentNodeId || "",
      campaignId: item.campaignId || "",
      nodeEnteredDate: item.nodeEnteredDate || "",
      senderUsed: item.senderUsed || "",
      ownerId: assignedOwnerId,
      ownerName: assignedOwnerName,
      lastModifiedBy: requestingUser?.name || "System",
      templateSource: item.templateSource || "campaign",
      updatedAt: now
    };
    if (!leadDoc.campaignId && leadDoc.campaign && leadDoc.campaign !== "Default") {
      const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
        name: { $regex: new RegExp(`^${leadDoc.campaign.trim()}$`, "i") }
      });
      if (matchedCamp && (matchedCamp.id || matchedCamp._id)) {
        leadDoc.campaignId = matchedCamp.id || String(matchedCamp._id);
      }
    }
    if (cleanEmail) {
      existingEmailMap.set(cleanEmail, { leadId: targetLeadId, ownerId: assignedOwnerId, ownerName: assignedOwnerName });
    }
    await col.updateOne(
      { leadId: targetLeadId },
      { $set: leadDoc, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    createdOrUpdated.push(leadDoc);
  }
  return createdOrUpdated;
}
async function reassignLead(leadId, targetUserId, requestingUser) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const usersCol = db.collection("users");
  const targetUser = await usersCol.findOne({ id: targetUserId });
  if (!targetUser || targetUser.isActive === false) {
    const err = new Error("Target user does not exist or is inactive");
    err.status = 400;
    throw err;
  }
  const lead = await leadsCol.findOne({ leadId: leadId.trim() });
  if (!lead) {
    const err = new Error("Lead not found");
    err.status = 404;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const prevOwnerName = lead.ownerName || lead.ownerId || "Unassigned";
  const prevOwnerId = lead.ownerId || "none";
  const newOwnerName = targetUser.name;
  const auditNote = `[Reassigned from ${prevOwnerName} (${prevOwnerId}) to ${newOwnerName} (${targetUserId}) by ${requestingUser.name} on ${now}]`;
  await leadsCol.updateOne(
    { leadId: lead.leadId },
    {
      $set: {
        ownerId: targetUserId,
        ownerName: newOwnerName,
        lastModifiedBy: requestingUser.name,
        notes: appendLeadNote(lead.notes, auditNote),
        updatedAt: now
      }
    }
  );
  const templateNotice = lead.templateSource === "own" ? `Notice: Lead "${lead.name}" uses personal template sequence, which now switches to ${newOwnerName}'s personal template sequence.` : null;
  return { success: true, leadId: lead.leadId, newOwnerId: targetUserId, newOwnerName, templateNotice };
}
async function reassignAllLeads(fromUserId, toUserId, requestingUser) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const usersCol = db.collection("users");
  const targetUser = await usersCol.findOne({ id: toUserId });
  if (!targetUser || targetUser.isActive === false) {
    const err = new Error("Target user does not exist or is inactive");
    err.status = 400;
    throw err;
  }
  const leads = await leadsCol.find({ ownerId: fromUserId }).toArray();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newOwnerName = targetUser.name;
  let count = 0;
  for (const lead of leads) {
    const prevOwnerName = lead.ownerName || fromUserId;
    const auditNote = `[Reassigned from ${prevOwnerName} (${fromUserId}) to ${newOwnerName} (${toUserId}) by ${requestingUser.name} on ${now}]`;
    await leadsCol.updateOne(
      { leadId: lead.leadId },
      {
        $set: {
          ownerId: toUserId,
          ownerName: newOwnerName,
          lastModifiedBy: requestingUser.name,
          notes: appendLeadNote(lead.notes, auditNote),
          updatedAt: now
        }
      }
    );
    count++;
  }
  return { success: true, reassignedCount: count, toUserId, toUserName: newOwnerName };
}
async function listCampaigns(token, spreadsheetId) {
  const db = await getDb();
  const campaigns = await db.collection(COLLECTIONS.CAMPAIGNS).find({}, { projection: { _id: 0 } }).toArray();
  return campaigns;
}
async function saveCampaign(campaign, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  if (!campaign.id) {
    throw new Error("saveCampaign requires campaign id");
  }
  const existing = await col.findOne({ id: campaign.id }, { projection: { _id: 0 } });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let versions = existing?.versions || [];
  let currentVersion = existing?.version || 1;
  if (existing) {
    if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
      const err = new Error("Forbidden: only the campaign owner or an admin can edit this campaign");
      err.status = 403;
      throw err;
    }
    const snapshot = {
      version: currentVersion,
      name: existing.name,
      workflow_graph: existing.workflow_graph,
      editedBy: existing.lastEditedBy || existing.ownerName || "Unknown",
      editedAt: existing.lastEditedAt || existing.updated_date || existing.created_date
    };
    versions = [snapshot, ...versions].slice(0, 10);
    currentVersion += 1;
  }
  const assignedOwnerId = existing ? existing.ownerId || requestingUser?.id || "" : requestingUser?.id || campaign.ownerId || "";
  const assignedOwnerName = existing ? existing.ownerName || requestingUser?.name || "" : requestingUser?.name || campaign.ownerName || "";
  const doc = {
    id: campaign.id,
    name: campaign.name || existing?.name || "Untitled Campaign",
    description: campaign.description !== void 0 ? campaign.description : existing?.description || "",
    version: currentVersion,
    is_active: Boolean(campaign.is_active ?? campaign.isActive ?? existing?.is_active ?? true),
    workflow_graph: campaign.workflow_graph || (campaign.nodes ? { nodes: campaign.nodes || [], edges: campaign.edges || [] } : existing?.workflow_graph || { nodes: [], edges: [] }),
    created_date: existing?.created_date || campaign.created_date || campaign.createdAt || now,
    updated_date: now,
    ownerId: assignedOwnerId,
    ownerName: assignedOwnerName,
    lastEditedBy: requestingUser?.name || "System",
    lastEditedAt: now,
    versions
  };
  await col.updateOne(
    { id: campaign.id },
    { $set: doc },
    { upsert: true }
  );
  if (!existing) {
    try {
      const { createTemplateSetForNewCampaign: createTemplateSetForNewCampaign2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
      await createTemplateSetForNewCampaign2(campaign.id, doc.name, requestingUser);
    } catch (cErr) {
      console.warn("[Campaign] Failed to create template set for new campaign:", cErr);
    }
  }
  return doc;
}
async function deleteCampaign(campaignId, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const cleanId = campaignId.trim();
  const existing = await col.findOne({ id: cleanId });
  if (!existing) {
    const err = new Error("Campaign not found");
    err.status = 404;
    throw err;
  }
  if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err = new Error("Forbidden: only the campaign owner or an admin can delete this campaign");
    err.status = 403;
    throw err;
  }
  const activeLeadsCount = await db.collection(COLLECTIONS.LEADS).countDocuments({
    campaignId: cleanId,
    status: "Active"
  });
  if (activeLeadsCount > 0) {
    const err = new Error(`Cannot delete campaign with active enrolled leads: ${activeLeadsCount} active lead(s) currently enrolled`);
    err.status = 400;
    throw err;
  }
  const result = await col.deleteOne({ id: cleanId });
  return result.deletedCount > 0;
}
async function toggleCampaignActive(campaignId, isActive, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const cleanId = campaignId.trim();
  const existing = await col.findOne({ id: cleanId }, { projection: { _id: 0 } });
  if (!existing) {
    const err = new Error(`Campaign with id "${campaignId}" not found`);
    err.status = 404;
    throw err;
  }
  if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err = new Error("Forbidden: only the campaign owner or an admin can toggle active state");
    err.status = 403;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await col.updateOne(
    { id: cleanId },
    { $set: { is_active: isActive, updated_date: now, lastEditedBy: requestingUser?.name || "System", lastEditedAt: now } }
  );
  const updated = await col.findOne({ id: cleanId }, { projection: { _id: 0 } });
  return updated;
}
async function checkCampaignImpact(campaignId, requestingUserId) {
  const db = await getDb();
  const leads = await db.collection(COLLECTIONS.LEADS).find({
    campaignId: campaignId.trim(),
    status: "Active"
  }).toArray();
  const totalActiveLeadsCount = leads.length;
  const userIds = /* @__PURE__ */ new Set();
  const userNames = /* @__PURE__ */ new Set();
  let colleagueLeadsCount = 0;
  for (const l of leads) {
    if (l.ownerId) userIds.add(l.ownerId);
    if (l.ownerName) userNames.add(l.ownerName);
    if (requestingUserId && l.ownerId && l.ownerId !== requestingUserId) {
      colleagueLeadsCount++;
    }
  }
  return {
    colleagueLeadsCount,
    enrolledOtherUsersLeadsCount: colleagueLeadsCount,
    totalActiveLeadsCount,
    userCount: userIds.size,
    affectedUserNames: Array.from(userNames)
  };
}
async function duplicateCampaign(campaignId, requestingUser, newName) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const existing = await col.findOne({ id: campaignId.trim() }, { projection: { _id: 0 } });
  if (!existing) {
    const err = new Error("Campaign not found");
    err.status = 404;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const duplicateName = newName || `${existing.name} (Copy)`;
  const doc = {
    id: newId,
    name: duplicateName,
    description: existing.description || "",
    version: 1,
    is_active: false,
    workflow_graph: JSON.parse(JSON.stringify(existing.workflow_graph || { nodes: [], edges: [] })),
    created_date: now,
    updated_date: now,
    ownerId: requestingUser?.id || "",
    ownerName: requestingUser?.name || "",
    lastEditedBy: requestingUser?.name || "",
    lastEditedAt: now,
    versions: []
  };
  await col.insertOne(doc);
  try {
    const { getCampaignTemplateSet: getCampaignTemplateSet2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
    const sourceSet = await getCampaignTemplateSet2(existing.id, existing.name);
    const newCampSet = {
      id: `tplset-camp-${newId}`,
      kind: "campaign",
      campaignId: newId,
      name: `${duplicateName} Sequence`,
      stages: sourceSet.stages.map((s) => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: requestingUser?.name || "System",
      updatedAt: now,
      createdAt: now
    };
    await db.collection(COLLECTIONS.TEMPLATE_SETS).insertOne(newCampSet);
  } catch (err) {
    console.warn("[Campaign] Template copy warning during duplicate:", err);
  }
  return doc;
}
async function restoreCampaignVersion(campaignId, targetVersion, requestingUser) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const existing = await col.findOne({ id: campaignId.trim() }, { projection: { _id: 0 } });
  if (!existing) {
    const err = new Error("Campaign not found");
    err.status = 404;
    throw err;
  }
  if (requestingUser && requestingUser.role !== "admin" && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err = new Error("Forbidden: only the campaign owner or an admin can restore versions");
    err.status = 403;
    throw err;
  }
  const versions = existing.versions || [];
  const targetSnapshot = versions.find((v) => v.version === targetVersion);
  if (!targetSnapshot) {
    const err = new Error(`Version ${targetVersion} not found in campaign history`);
    err.status = 404;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentSnapshot = {
    version: existing.version || 1,
    name: existing.name,
    workflow_graph: existing.workflow_graph,
    editedBy: existing.lastEditedBy || existing.ownerName || "Unknown",
    editedAt: existing.lastEditedAt || existing.updated_date || existing.created_date
  };
  const updatedVersions = [currentSnapshot, ...versions.filter((v) => v.version !== targetVersion)].slice(0, 10);
  const newVersionNumber = (existing.version || 1) + 1;
  const restoredDoc = {
    ...existing,
    name: targetSnapshot.name,
    workflow_graph: targetSnapshot.workflow_graph,
    version: newVersionNumber,
    lastEditedBy: requestingUser?.name || "System",
    lastEditedAt: now,
    updated_date: now,
    versions: updatedVersions
  };
  await col.updateOne({ id: campaignId.trim() }, { $set: restoredDoc });
  return restoredDoc;
}
async function loadLocalSenders() {
  const serviceAccount = (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || "").trim();
  const displayName = (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || "Microsoft Graph Service Mailbox").trim();
  const db = await getDb();
  let senders = await db.collection(COLLECTIONS.SENDERS).find({}, { projection: { _id: 0 } }).toArray();
  if (senders.length === 0) {
    const defaultSender = {
      id: "sender-primary",
      name: displayName,
      email: serviceAccount || "service-account@domain.com",
      avatarUrl: "",
      status: "connected",
      isPrimary: true,
      dailySendLimit: 500,
      sendsToday: 0,
      provider: "outlook",
      lastUsedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await db.collection(COLLECTIONS.SENDERS).insertOne(defaultSender);
    return [defaultSender];
  }
  if (serviceAccount) {
    return senders.map((s, idx) => {
      if (s.isPrimary || idx === 0) {
        return {
          ...s,
          name: displayName || s.name,
          email: serviceAccount,
          provider: "outlook",
          status: "connected"
        };
      }
      return {
        ...s,
        provider: s.provider || "outlook"
      };
    });
  }
  return senders.map((s) => ({
    ...s,
    provider: s.provider || "outlook"
  }));
}
async function saveLocalSenders(senders) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SENDERS);
  const normalized = senders.map((s) => ({
    ...s,
    provider: s.provider || "outlook"
  }));
  if (normalized.length > 0) {
    const ops = normalized.map((s) => ({
      updateOne: {
        filter: { id: s.id },
        update: { $set: s },
        upsert: true
      }
    }));
    await col.bulkWrite(ops);
  }
  return normalized;
}
async function loadLocalTasks(ownerId) {
  const db = await getDb();
  if (ownerId) {
    const leads = await db.collection(COLLECTIONS.LEADS).find({ ownerId }, { projection: { leadId: 1 } }).toArray();
    const leadIds = leads.map((l) => l.leadId);
    return db.collection(COLLECTIONS.TASKS).find({ leadId: { $in: leadIds } }, { projection: { _id: 0 } }).toArray();
  }
  return db.collection(COLLECTIONS.TASKS).find({}, { projection: { _id: 0 } }).toArray();
}
async function saveLocalTasks(tasks) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  if (tasks.length > 0) {
    const ops = tasks.map((t) => ({
      updateOne: {
        filter: { id: t.id },
        update: { $set: t },
        upsert: true
      }
    }));
    await col.bulkWrite(ops);
  }
  return tasks;
}
async function updateLocalTask(taskId, updates) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  await col.updateOne({ id: taskId }, { $set: updates });
  const updated = await col.findOne({ id: taskId }, { projection: { _id: 0 } });
  return updated;
}
async function deleteLocalTask(taskId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  const result = await col.deleteOne({ id: taskId });
  return result.deletedCount > 0;
}
async function loadTaskAlertsState() {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.SETTINGS).findOne({ id: "task_alerts_state" });
  return {
    dismissedAlertIds: Array.isArray(doc?.dismissedAlertIds) ? doc.dismissedAlertIds : []
  };
}
async function saveDismissedTaskAlerts(alertIds) {
  const db = await getDb();
  const existing = await loadTaskAlertsState();
  const merged = Array.from(/* @__PURE__ */ new Set([...existing.dismissedAlertIds, ...alertIds]));
  await db.collection(COLLECTIONS.SETTINGS).updateOne(
    { id: "task_alerts_state" },
    { $set: { id: "task_alerts_state", dismissedAlertIds: merged, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
    { upsert: true }
  );
  return merged;
}
async function clearTaskAlertsState() {
  const db = await getDb();
  await db.collection(COLLECTIONS.SETTINGS).updateOne(
    { id: "task_alerts_state" },
    { $set: { id: "task_alerts_state", dismissedAlertIds: [], updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
    { upsert: true }
  );
}
async function loadUserWorkspaceNotes(userId) {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.USER_WORKSPACE_NOTES).findOne({ userId });
  return doc?.notes || "";
}
async function saveUserWorkspaceNotes(userId, notes) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.collection(COLLECTIONS.USER_WORKSPACE_NOTES).updateOne(
    { userId },
    { $set: { userId, notes, updatedAt: now } },
    { upsert: true }
  );
  return notes;
}
async function loadUserAlertsState(userId) {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.USER_ALERT_STATES).findOne({ userId });
  return {
    dismissedAlertIds: Array.isArray(doc?.dismissedAlertIds) ? doc.dismissedAlertIds : []
  };
}
async function saveUserDismissedAlerts(userId, alertIds) {
  const db = await getDb();
  const existing = await loadUserAlertsState(userId);
  const merged = Array.from(/* @__PURE__ */ new Set([...existing.dismissedAlertIds, ...alertIds]));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.collection(COLLECTIONS.USER_ALERT_STATES).updateOne(
    { userId },
    { $set: { userId, dismissedAlertIds: merged, updatedAt: now } },
    { upsert: true }
  );
  return merged;
}
async function clearUserAlertsState(userId) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.collection(COLLECTIONS.USER_ALERT_STATES).updateOne(
    { userId },
    { $set: { userId, dismissedAlertIds: [], updatedAt: now } },
    { upsert: true }
  );
}
async function loadLocalSettings() {
  const db = await getDb();
  const settings = await db.collection(COLLECTIONS.SETTINGS).findOne({ id: "app_settings" }, { projection: { _id: 0 } });
  if (!settings) {
    return {
      id: "app_settings",
      spreadsheetName: "Outreach Flow CRM",
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: "Outreach Flow",
      senderEmail: "connect@giniiris.ai",
      appName: "Outreach Flow"
    };
  }
  return settings;
}
async function saveLocalSettings(settings) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SETTINGS);
  const cleanHeader = settings.emailHeader !== void 0 ? sanitizeHtml(settings.emailHeader) : void 0;
  const cleanFooter = settings.emailFooter !== void 0 ? sanitizeHtml(settings.emailFooter) : void 0;
  const doc = {
    ...settings,
    ...cleanHeader !== void 0 ? { emailHeader: cleanHeader } : {},
    ...cleanFooter !== void 0 ? { emailFooter: cleanFooter } : {},
    id: "app_settings",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await col.updateOne(
    { id: "app_settings" },
    { $set: doc },
    { upsert: true }
  );
  return doc;
}
async function loadTrackingEvents(ownerId) {
  const db = await getDb();
  if (ownerId) {
    const leads = await db.collection(COLLECTIONS.LEADS).find({ ownerId }, { projection: { leadId: 1 } }).toArray();
    const leadIds = leads.map((l) => l.leadId);
    return db.collection(COLLECTIONS.TRACKING_EVENTS).find({ leadId: { $in: leadIds } }, { projection: { _id: 0 } }).toArray();
  }
  return db.collection(COLLECTIONS.TRACKING_EVENTS).find({}, { projection: { _id: 0 } }).toArray();
}
async function recordTrackingEvent(event) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TRACKING_EVENTS);
  await col.updateOne(
    { id: event.id },
    { $set: event },
    { upsert: true }
  );
  try {
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const filterConditions = [];
    if (event.leadId && event.leadId !== "TEST") {
      filterConditions.push({ leadId: event.leadId });
    }
    if (event.email) {
      filterConditions.push({ email: event.email });
    }
    if (filterConditions.length > 0) {
      const updateDoc = {
        $set: {
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...event.type === "open" ? { lastOpenedDate: event.timestamp } : { lastClickedDate: event.timestamp }
        },
        $inc: {
          ...event.type === "open" ? { opensCount: 1 } : { clicksCount: 1 }
        }
      };
      await leadsCol.updateOne({ $or: filterConditions }, updateDoc);
    }
  } catch (leadUpdateErr) {
    console.warn("Could not update lead engagement counters on tracking event:", leadUpdateErr);
  }
  return event;
}
async function clearAllTrackingEvents() {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TRACKING_EVENTS);
  await col.deleteMany({});
  return true;
}
async function getSystemStatsSummary(ownerId) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const tasksCol = db.collection(COLLECTIONS.TASKS);
  const sendersCol = db.collection(COLLECTIONS.SENDERS);
  const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
  const leadsFilter = ownerId ? { ownerId } : {};
  let tasksFilter = {};
  let eventsFilter = {};
  if (ownerId) {
    const leads = await leadsCol.find({ ownerId }, { projection: { leadId: 1 } }).toArray();
    const leadIds = leads.map((l) => l.leadId);
    tasksFilter = { leadId: { $in: leadIds } };
    eventsFilter = { leadId: { $in: leadIds } };
  }
  const [
    totalLeads,
    activeLeads,
    repliedLeads,
    totalCampaigns,
    activeCampaigns,
    totalTasks,
    pendingTasks,
    totalSenders,
    totalOpens,
    totalClicks
  ] = await Promise.all([
    leadsCol.countDocuments(leadsFilter),
    leadsCol.countDocuments({ ...leadsFilter, status: "Active" }),
    leadsCol.countDocuments({ ...leadsFilter, status: "Replied" }),
    campaignsCol.countDocuments(),
    campaignsCol.countDocuments({ is_active: true }),
    tasksCol.countDocuments(tasksFilter),
    tasksCol.countDocuments({ ...tasksFilter, isCompleted: false }),
    sendersCol.countDocuments(),
    eventsCol.countDocuments({ ...eventsFilter, type: "open" }),
    eventsCol.countDocuments({ ...eventsFilter, type: "click" })
  ]);
  return {
    leads: {
      total: totalLeads,
      active: activeLeads,
      replied: repliedLeads,
      paused: totalLeads - activeLeads - repliedLeads
    },
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns
    },
    tasks: {
      total: totalTasks,
      pending: pendingTasks
    },
    senders: {
      total: totalSenders
    },
    tracking: {
      totalOpens,
      totalClicks
    }
  };
}
function cleanLeadNotes(existingNotes) {
  if (!existingNotes || !existingNotes.trim()) return "";
  const parts = existingNotes.split("|").map((p) => p.trim()).filter(Boolean);
  const seen = /* @__PURE__ */ new Set();
  const cleaned = [];
  for (const part of parts) {
    if (/Reply detected on \d{4}-\d{2}-\d{2}: Incoming reply flag detected/i.test(part)) {
      continue;
    }
    const normalized = part.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    cleaned.push(part);
  }
  const hasSpecificSentiment = cleaned.some((p) => /\[(?:Negative|Positive|Neutral) reply detected/i.test(p));
  const finalParts = hasSpecificSentiment ? cleaned.filter((p) => p !== "Reply detected" && p !== "[Reply detected]") : cleaned;
  return finalParts.join(" | ");
}
function appendLeadNote(existingNotes, newTag) {
  const cleaned = cleanLeadNotes(existingNotes);
  if (!cleaned) return newTag;
  if (!newTag || !newTag.trim()) return cleaned;
  const tagBase = newTag.replace(/\s+by\s+(auto|manual).*/i, "").trim();
  if (cleaned.toLowerCase().includes(tagBase.toLowerCase()) || cleaned.toLowerCase().includes(newTag.toLowerCase())) {
    return cleaned;
  }
  return `${cleaned} | ${newTag}`;
}
async function applyLeadReply(params) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const cleanEmail = (params.leadEmail || params.from || "").trim().toLowerCase();
  const cleanThreadId = (params.threadId || "").trim();
  let matchedLead = null;
  if (cleanThreadId && !cleanThreadId.startsWith("graph-conv-")) {
    matchedLead = await leadsCol.findOne({ threadId: cleanThreadId }, { projection: { _id: 0 } });
  }
  if (!matchedLead && cleanEmail) {
    matchedLead = await leadsCol.findOne(
      { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      { projection: { _id: 0 } }
    );
  }
  const isDummySystemBody = !params.body || params.body.includes("Incoming reply flag detected on lead record") || params.body.includes("Status already marked Replied") || params.body.includes("Status marked Negative Reply");
  const repliesCol = db.collection(COLLECTIONS.INBOUND_REPLIES);
  let existingReply = null;
  if (params.messageId) {
    existingReply = await repliesCol.findOne({ id: params.messageId });
  }
  if (!existingReply && cleanEmail && params.body && !isDummySystemBody) {
    const normalizedBody = params.body.trim().replace(/\s+/g, " ").toLowerCase();
    const candidateQuery = {
      $or: [
        { leadEmail: cleanEmail },
        ...cleanThreadId ? [{ threadId: cleanThreadId }] : []
      ]
    };
    const candidateReplies = await repliesCol.find(candidateQuery).toArray();
    existingReply = candidateReplies.find((r) => {
      const rBody = (r.body || r.snippet || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (!rBody) return false;
      return rBody === normalizedBody || rBody.length > 30 && normalizedBody.length > 30 && (rBody.startsWith(normalizedBody.slice(0, 50)) || normalizedBody.startsWith(rBody.slice(0, 50)));
    });
  }
  const replyId = existingReply?.id || params.messageId || `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const receivedAt = existingReply?.receivedDateTime || params.receivedDateTime || (/* @__PURE__ */ new Date()).toISOString();
  const replyDoc = existingReply || {
    id: replyId,
    leadEmail: cleanEmail || matchedLead?.email || "",
    leadId: matchedLead?.leadId,
    threadId: cleanThreadId || matchedLead?.threadId || "",
    from: params.from || cleanEmail,
    subject: params.subject || "Re: Outreach Flow follow-up",
    body: params.body || "",
    receivedDateTime: receivedAt,
    source: params.source || "Webhook"
  };
  if (!existingReply && !isDummySystemBody) {
    try {
      await repliesCol.updateOne(
        { id: replyId },
        { $set: replyDoc },
        { upsert: true }
      );
    } catch (err) {
      console.warn("[MongoDB] Could not persist inbound reply document:", err);
    }
  }
  if (!matchedLead) {
    return {
      success: true,
      applied: false,
      reply: replyDoc,
      message: `No lead matched email "${cleanEmail}" or thread "${cleanThreadId}". Inbound reply stored.`
    };
  }
  const activeKeywords = await getActiveKeywords().catch(() => void 0);
  const classification = classifyReply(params.subject, params.body, activeKeywords);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateFields = {
    hasReplied: true,
    hasUnreadReply: true,
    lastReplyReceivedDate: receivedAt,
    replySentiment: classification.sentiment,
    replyClassifiedBy: params.classifiedBy || "auto",
    replyClassifiedAt: now,
    replyMatchedPhrases: classification.matchedPhrases,
    replyReason: classification.reason,
    updatedAt: now
  };
  let pausedCompanyLeadsCount = 0;
  let pendingConfirmation = void 0;
  if (classification.sentiment === "negative") {
    updateFields.status = "Negative Reply";
    updateFields.stoppedReason = "Negative reply received";
    updateFields.stoppedByLeadId = void 0;
    const noteTag = `[Negative reply detected (${classification.matchedPhrases.join(", ") || "disinterest"}) by ${params.classifiedBy || "auto"}: Sequence stopped]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);
  } else if (classification.sentiment === "positive") {
    updateFields.status = "Replied";
    const noteTag = `[Positive reply detected (${classification.matchedPhrases.join(", ") || "interest"}) by ${params.classifiedBy || "auto"}]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);
    const settings = await loadLocalSettings().catch(() => null);
    const positiveAction = settings?.positiveReplyAction || "pause_automatically";
    const otherActiveLeads = await leadsCol.find(
      {
        leadId: { $ne: matchedLead.leadId },
        status: "Active"
      },
      { projection: { _id: 0 } }
    ).toArray();
    const sameCompanyLeads = otherActiveLeads.filter((other) => areSameCompany(matchedLead, other));
    if (positiveAction === "ask_first") {
      if (sameCompanyLeads.length > 0) {
        pendingConfirmation = {
          candidateLeadIds: sameCompanyLeads.map((l) => l.leadId),
          companyName: matchedLead.company,
          count: sameCompanyLeads.length
        };
        updateFields.pendingCompanyPause = pendingConfirmation;
      }
    } else {
      for (const other of sameCompanyLeads) {
        const stopReason = `Positive reply from ${matchedLead.name} at the same company`;
        await leadsCol.updateOne(
          { leadId: other.leadId },
          {
            $set: {
              status: "Paused",
              stoppedReason: stopReason,
              stoppedByLeadId: matchedLead.leadId,
              notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
              updatedAt: now
            }
          }
        );
        pausedCompanyLeadsCount++;
      }
    }
  } else {
    updateFields.status = "Replied";
    const autoTag = classification.isAutoReply ? " (auto-reply)" : "";
    const noteTag = `[Neutral reply detected${autoTag} by ${params.classifiedBy || "auto"}: Manual follow-up needed]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);
  }
  await leadsCol.updateOne({ leadId: matchedLead.leadId }, { $set: updateFields });
  const updatedLeadDoc = await leadsCol.findOne({ leadId: matchedLead.leadId }, { projection: { _id: 0 } });
  return {
    success: true,
    applied: true,
    lead: updatedLeadDoc || { ...matchedLead, ...updateFields },
    reply: replyDoc,
    classification,
    pausedCompanyLeadsCount,
    pendingConfirmation
  };
}
async function manualOverrideSentiment(leadId, newSentiment, reason) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const lead = await leadsCol.findOne({ leadId }, { projection: { _id: 0 } });
  if (!lead) {
    return { success: false, pausedCount: 0, resumedCount: 0 };
  }
  let resumedCount = 0;
  let pausedCount = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (lead.replySentiment === "positive") {
    const leadsToResume = await leadsCol.find(
      { stoppedByLeadId: leadId, status: "Paused" },
      { projection: { _id: 0 } }
    ).toArray();
    for (const pausedLead of leadsToResume) {
      await leadsCol.updateOne(
        { leadId: pausedLead.leadId },
        {
          $set: {
            status: "Active",
            notes: appendLeadNote(pausedLead.notes, `[Resumed: Positive reply from ${lead.name} overridden]`),
            updatedAt: now
          },
          $unset: {
            stoppedReason: "",
            stoppedByLeadId: ""
          }
        }
      );
      resumedCount++;
    }
  }
  const overrideReason = reason || `Manual override to ${newSentiment}`;
  const noteTag = `[Sentiment manually updated to ${newSentiment} by user: ${overrideReason}]`;
  const updateFields = {
    replySentiment: newSentiment,
    replyClassifiedBy: "manual",
    replyClassifiedAt: now,
    replyReason: overrideReason,
    notes: appendLeadNote(lead.notes, noteTag),
    updatedAt: now
  };
  if (newSentiment === "positive") {
    updateFields.status = "Replied";
    updateFields.stoppedReason = void 0;
    const otherActiveLeads = await leadsCol.find(
      {
        leadId: { $ne: leadId },
        status: "Active"
      },
      { projection: { _id: 0 } }
    ).toArray();
    const sameCompanyLeads = otherActiveLeads.filter((other) => areSameCompany(lead, other));
    for (const other of sameCompanyLeads) {
      const stopReason = `Positive reply from ${lead.name} at the same company`;
      await leadsCol.updateOne(
        { leadId: other.leadId },
        {
          $set: {
            status: "Paused",
            stoppedReason: stopReason,
            stoppedByLeadId: lead.leadId,
            notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
            updatedAt: now
          }
        }
      );
      pausedCount++;
    }
  } else if (newSentiment === "negative") {
    updateFields.status = "Negative Reply";
    updateFields.stoppedReason = "Negative reply (manual override)";
    updateFields.stoppedByLeadId = void 0;
  } else {
    updateFields.status = "Replied";
    updateFields.stoppedReason = void 0;
  }
  await leadsCol.updateOne({ leadId }, { $set: updateFields });
  const updatedLead = await leadsCol.findOne({ leadId }, { projection: { _id: 0 } });
  return {
    success: true,
    lead: updatedLead || void 0,
    pausedCount,
    resumedCount
  };
}
async function resumeCompanyLeads(replyingLeadId) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const leadsToResume = await leadsCol.find(
    { stoppedByLeadId: replyingLeadId, status: "Paused" },
    { projection: { _id: 0 } }
  ).toArray();
  let resumedCount = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const lead of leadsToResume) {
    await leadsCol.updateOne(
      { leadId: lead.leadId },
      {
        $set: {
          status: "Active",
          notes: appendLeadNote(lead.notes, `[Resumed company outreach by user from lead ${replyingLeadId}]`),
          updatedAt: now
        },
        $unset: {
          stoppedReason: "",
          stoppedByLeadId: ""
        }
      }
    );
    resumedCount++;
  }
  const replyingLead = await leadsCol.findOne({ leadId: replyingLeadId }, { projection: { _id: 0 } });
  if (replyingLead && replyingLead.status === "Paused") {
    await leadsCol.updateOne(
      { leadId: replyingLeadId },
      {
        $set: {
          status: "Active",
          notes: appendLeadNote(replyingLead.notes, `[Resumed company outreach]`),
          updatedAt: now
        },
        $unset: {
          stoppedReason: "",
          stoppedByLeadId: ""
        }
      }
    );
    resumedCount++;
  }
  return {
    success: true,
    resumedCount
  };
}
async function confirmCompanyPause(replyingLeadId) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const replyingLead = await leadsCol.findOne({ leadId: replyingLeadId }, { projection: { _id: 0 } });
  if (!replyingLead) {
    return { success: false, pausedCount: 0 };
  }
  const otherActiveLeads = await leadsCol.find(
    {
      leadId: { $ne: replyingLeadId },
      status: "Active"
    },
    { projection: { _id: 0 } }
  ).toArray();
  const sameCompanyLeads = otherActiveLeads.filter((other) => areSameCompany(replyingLead, other));
  let pausedCount = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const other of sameCompanyLeads) {
    const stopReason = `Positive reply from ${replyingLead.name} at the same company`;
    await leadsCol.updateOne(
      { leadId: other.leadId },
      {
        $set: {
          status: "Paused",
          stoppedReason: stopReason,
          stoppedByLeadId: replyingLead.leadId,
          notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
          updatedAt: now
        }
      }
    );
    pausedCount++;
  }
  if (replyingLead.status === "Active") {
    await leadsCol.updateOne(
      { leadId: replyingLeadId },
      {
        $set: {
          status: "Paused",
          stoppedReason: "Positive reply received",
          updatedAt: now
        }
      }
    );
    pausedCount++;
  }
  await leadsCol.updateOne(
    { leadId: replyingLeadId },
    {
      $unset: { pendingCompanyPause: "" },
      $set: { updatedAt: now }
    }
  );
  return {
    success: true,
    pausedCount
  };
}
var init_mongoBackend = __esm({
  "server/mongoBackend.ts"() {
    init_mongodb();
    init_replyRules();
    init_templateBackend();
  }
});

// server/app.ts
init_mongoBackend();
init_replyRules();
init_mongodb();
import express from "express";
import { MongoClient as MongoClient2 } from "mongodb";

// server/importBackend.ts
import * as XLSX from "xlsx";
function normalizeHeader(h) {
  return String(h || "").toLowerCase().replace(/[_\-\s\.\(\)\/]+/g, "").trim();
}
function parseFileBuffer(buffer, filename, existingEmails = [], customMapping) {
  const existingSet = new Set(existingEmails.map((e) => e.trim().toLowerCase()));
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file does not contain any readable sheets.");
  }
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rawRows || rawRows.length < 2) {
    throw new Error("The uploaded file has no data rows (header or data missing).");
  }
  let headerIndex = 0;
  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const rowStr = rawRows[r].map((c) => normalizeHeader(String(c))).join(" ");
    if (rowStr.includes("email") || rowStr.includes("mail") || rowStr.includes("contact") || rowStr.includes("name") || rowStr.includes("lead")) {
      headerIndex = r;
      break;
    }
  }
  const headerRow = rawRows[headerIndex] || [];
  const rawHeaders = headerRow.map((col, idx) => {
    const str = String(col ?? "").trim();
    return str || `Column_${idx + 1}`;
  });
  const rawRowsObjects = [];
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c) => !c || String(c).trim() === "")) {
      continue;
    }
    const rowObj = {};
    rawHeaders.forEach((h, colIdx) => {
      rowObj[h] = r[colIdx] !== void 0 ? String(r[colIdx]).trim() : "";
    });
    rawRowsObjects.push(rowObj);
  }
  const colMap = {};
  const detectedHeadersDisplay = {};
  if (customMapping && Object.keys(customMapping).length > 0) {
    Object.entries(customMapping).forEach(([targetKey, mappedHeader]) => {
      if (!mappedHeader) return;
      const idx = rawHeaders.indexOf(mappedHeader);
      if (idx !== -1) {
        colMap[targetKey] = idx;
        detectedHeadersDisplay[targetKey] = mappedHeader;
        if (targetKey === "first_name") colMap["firstName"] = idx;
        if (targetKey === "firstName") colMap["first_name"] = idx;
        if (targetKey === "last_name") colMap["lastName"] = idx;
        if (targetKey === "lastName") colMap["last_name"] = idx;
        if (targetKey === "job_title") colMap["jobTitle"] = idx;
        if (targetKey === "jobTitle") colMap["job_title"] = idx;
        if (targetKey === "linkedin_url") colMap["linkedinUrl"] = idx;
        if (targetKey === "linkedinUrl") colMap["linkedin_url"] = idx;
        if (targetKey === "pain_point") colMap["painPoint"] = idx;
        if (targetKey === "painPoint") colMap["pain_point"] = idx;
      }
    });
  } else {
    headerRow.forEach((col, idx) => {
      const orig = String(col || "").trim();
      const norm = normalizeHeader(orig);
      if (["email", "emailaddress", "mail", "workemail", "contactemail", "e-mail", "electronicmail", "useremail"].includes(norm)) {
        if (colMap.email === void 0) {
          colMap.email = idx;
          detectedHeadersDisplay.email = orig;
        }
      } else if (["firstname", "first", "givenname", "fname"].includes(norm)) {
        if (colMap.firstName === void 0) {
          colMap.firstName = idx;
          detectedHeadersDisplay.firstName = orig;
        }
      } else if (["lastname", "last", "surname", "lname"].includes(norm)) {
        if (colMap.lastName === void 0) {
          colMap.lastName = idx;
          detectedHeadersDisplay.lastName = orig;
        }
      } else if (["name", "fullname", "contactname", "leadname", "prospect", "person", "prospectname"].includes(norm)) {
        if (colMap.name === void 0) {
          colMap.name = idx;
          detectedHeadersDisplay.name = orig;
        }
      } else if (["company", "companyname", "organization", "org", "business", "account", "firm", "targetfirm", "clientcompany"].includes(norm)) {
        if (colMap.company === void 0) {
          colMap.company = idx;
          detectedHeadersDisplay.company = orig;
        }
      } else if (["jobtitle", "title", "position", "role", "designation", "job"].includes(norm)) {
        if (colMap.jobTitle === void 0) {
          colMap.jobTitle = idx;
          detectedHeadersDisplay.jobTitle = orig;
        }
      } else if (["painpoint", "painpoints", "problem", "challenge", "challenges", "friction", "frictionpoint", "bottleneck", "issues"].includes(norm)) {
        if (colMap.painPoint === void 0) {
          colMap.painPoint = idx;
          detectedHeadersDisplay.painPoint = orig;
        }
      } else if (["linkedin", "linkedinurl", "linkedinprofile", "profileurl", "social"].includes(norm)) {
        if (colMap.linkedinUrl === void 0) {
          colMap.linkedinUrl = idx;
          detectedHeadersDisplay.linkedinUrl = orig;
        }
      } else if (["industry", "sector", "vertical", "domain"].includes(norm)) {
        if (colMap.industry === void 0) {
          colMap.industry = idx;
          detectedHeadersDisplay.industry = orig;
        }
      } else if (["campaign", "campaignname", "list", "tag", "tags"].includes(norm)) {
        if (colMap.campaign === void 0) {
          colMap.campaign = idx;
          detectedHeadersDisplay.campaign = orig;
        }
      } else if (["notes", "note", "comments", "comment", "description", "memo"].includes(norm)) {
        if (colMap.notes === void 0) {
          colMap.notes = idx;
          detectedHeadersDisplay.notes = orig;
        }
      }
    });
  }
  const missingRequired = [];
  if (colMap.email === void 0) {
    missingRequired.push("email");
  }
  const autoMapped = missingRequired.length === 0;
  const parsedRows = [];
  const seenInBatch = /* @__PURE__ */ new Set();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c) => !c || String(c).trim() === "")) {
      continue;
    }
    const getVal = (field) => {
      if (colMap[field] !== void 0 && r[colMap[field]] !== void 0) {
        return String(r[colMap[field]]).trim();
      }
      return "";
    };
    let email = getVal("email").toLowerCase();
    let firstName = getVal("firstName");
    let lastName = getVal("lastName");
    let fullName = getVal("name");
    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && !firstName && !lastName) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
    const company = getVal("company") || "Prospective Company";
    const jobTitle = getVal("jobTitle");
    const linkedinUrl = getVal("linkedinUrl");
    const painPoint = getVal("painPoint") || "Optimizing team outreach & qualification";
    const industry = getVal("industry");
    const notes = getVal("notes");
    const campaign = getVal("campaign") || "Direct Inbound";
    let isValid = true;
    let validationError = void 0;
    let isDuplicate = false;
    let duplicateReason = void 0;
    if (colMap.email === void 0) {
      isValid = false;
      validationError = 'Required column "Email Address" not detected in file headers (manual mapping required)';
    } else if (!email) {
      isValid = false;
      validationError = "Missing email address";
    } else if (!emailRegex.test(email)) {
      isValid = false;
      validationError = `Invalid email syntax: "${email}"`;
    } else if (existingSet.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Already exists in Leads database (${email})`;
    } else if (seenInBatch.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Duplicate within this file (${email})`;
    } else {
      seenInBatch.add(email);
    }
    parsedRows.push({
      rowNumber: i + 1,
      firstName,
      lastName,
      name: fullName || "Prospect",
      email,
      company,
      jobTitle,
      linkedinUrl,
      painPoint,
      industry,
      notes,
      campaign,
      isValid,
      validationError,
      isDuplicate,
      duplicateReason
    });
  }
  const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
  const duplicateRows = parsedRows.filter((r) => r.isDuplicate);
  const errorRows = parsedRows.filter((r) => !r.isValid && !r.isDuplicate);
  return {
    success: true,
    filename,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    duplicateCount: duplicateRows.length,
    errorCount: errorRows.length,
    rawHeaders,
    rawRows: rawRowsObjects,
    headersDetected: detectedHeadersDisplay,
    detectedHeaderList: rawHeaders,
    missingRequired,
    autoMapped,
    preview: parsedRows.slice(0, 15),
    leads: parsedRows,
    allRows: parsedRows,
    validRows,
    duplicateRows,
    errorRows,
    invalidRows: errorRows
  };
}

// server/runnerBackend.ts
init_mongoBackend();

// server/msGraphAuth.ts
function getGraphConfig() {
  return {
    tenantId: (process.env.MICROSOFT_GRAPH_TENANT_ID || "").trim(),
    clientId: (process.env.MICROSOFT_GRAPH_CLIENT_ID || "").trim(),
    clientSecret: (process.env.MICROSOFT_GRAPH_CLIENT_SECRET || "").trim(),
    serviceAccount: (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || "").trim(),
    displayName: (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || "Outreach Flow").trim()
  };
}
var cachedToken = null;
var tokenFetchPromise = null;
async function getAppAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 3e5) {
    return cachedToken.accessToken;
  }
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }
  tokenFetchPromise = (async () => {
    try {
      const config = getGraphConfig();
      if (!config.tenantId) {
        throw new Error("MICROSOFT_GRAPH_TENANT_ID environment variable is missing.");
      }
      if (!config.clientId) {
        throw new Error("MICROSOFT_GRAPH_CLIENT_ID environment variable is missing.");
      }
      if (!config.clientSecret) {
        throw new Error("MICROSOFT_GRAPH_CLIENT_SECRET environment variable is missing.");
      }
      const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", config.clientId);
      params.append("client_secret", config.clientSecret);
      params.append("scope", "https://graph.microsoft.com/.default");
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { error_description: errorText };
        }
        const errorMsg = parsedError.error_description || parsedError.error || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Microsoft Graph OAuth client credentials failed (${response.status}): ${errorMsg}`);
      }
      const data = await response.json();
      const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3599;
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error("No access_token returned by Microsoft identity platform.");
      }
      cachedToken = {
        accessToken,
        expiresAt: Date.now() + expiresInSec * 1e3
      };
      return accessToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();
  return tokenFetchPromise;
}
async function getAuthDiagnostics() {
  const config = getGraphConfig();
  const now = Date.now();
  const configured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );
  const tokenExpiresInSec = cachedToken && cachedToken.expiresAt > now ? Math.round((cachedToken.expiresAt - now) / 1e3) : 0;
  return {
    configured,
    tenantId: config.tenantId ? `${config.tenantId.substring(0, 8)}...` : "",
    clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : "",
    hasClientSecret: Boolean(config.clientSecret),
    serviceAccount: config.serviceAccount,
    displayName: config.displayName,
    hasCachedToken: Boolean(cachedToken && cachedToken.expiresAt > now),
    tokenExpiresInSec
  };
}

// server/msGraphService.ts
init_defaultTemplates();

// server/urlHelper.ts
function getPublicBaseUrl(req) {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  const isProduction = process.env.NODE_ENV === "production" || isVercel;
  const envAppUrl = process.env.APP_URL?.trim();
  if (envAppUrl) {
    let clean = envAppUrl.replace(/\/+$/, "");
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    if (isProduction && clean.startsWith("http://")) {
      clean = clean.replace(/^http:\/\//, "https://");
    }
    return clean;
  }
  const vercelProjectProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProjectProd) {
    const clean = vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    return `https://${clean}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (isVercel && vercelUrl) {
    const clean = vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    return `https://${clean}`;
  }
  if (req) {
    const forwardedHost = req.headers["x-forwarded-host"] || "";
    const hostHeader = req.get("host") || "";
    const host = forwardedHost.split(",")[0].trim() || hostHeader;
    if (isVercel && (!host || host.includes("localhost") || host.includes("127.0.0.1"))) {
      if (vercelProjectProd) {
        return `https://${vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
      }
      if (vercelUrl) {
        return `https://${vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
      }
    }
    if (host) {
      const forwardedProto = req.headers["x-forwarded-proto"] || "";
      const isHttps = isProduction || forwardedProto === "https" || req.protocol === "https";
      const proto = isHttps ? "https" : "http";
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }
  if (isVercel || isProduction) {
    if (vercelProjectProd) {
      return `https://${vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
    }
    if (vercelUrl) {
      return `https://${vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
    }
  }
  return "http://localhost:3000";
}

// server/msGraphService.ts
init_mongodb();
init_mongoBackend();
import crypto2 from "crypto";
async function sendAppEmail(params) {
  const config = getGraphConfig();
  const stage = params.stageNum || params.template.stage || 1;
  const effectiveSenderName = params.senderDisplayName || config.displayName || "Outreach Flow";
  const { loadLocalSettings: loadLocalSettings2 } = await Promise.resolve().then(() => (init_mongoBackend(), mongoBackend_exports));
  const settings = await loadLocalSettings2().catch(() => null);
  const headerHtml = settings?.emailHeader || "";
  const footerHtml = settings?.emailFooter || "";
  const { composeFullEmail: composeFullEmail2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
  const renderedSubject = renderEmailMergeTags(params.template.subject, params.lead, effectiveSenderName);
  const { composedHtml } = composeFullEmail2({
    bodyHtml: params.template.bodyHtml,
    headerHtml,
    footerHtml,
    lead: params.lead,
    stage,
    senderDisplayName: effectiveSenderName,
    baseUrl: params.baseUrl,
    embedTrackingPixel: true
  });
  const finalHtmlBody = composedHtml;
  if (!config.serviceAccount || !config.tenantId || !config.clientId) {
    console.warn(
      `[MS Graph] Notice: Microsoft Graph credentials not configured in environment. Using development simulated send for ${params.lead.email}.`
    );
    const simulatedMsgId = `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const simulatedThreadId = params.lead.threadId || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      messageId: simulatedMsgId,
      threadId: simulatedThreadId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      to: params.lead.email,
      subject: renderedSubject,
      bodyHtml: finalHtmlBody,
      statusCode: 200
    };
  }
  const token = await getAppAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;
  const emailMessage = {
    message: {
      subject: renderedSubject,
      body: {
        contentType: "HTML",
        content: finalHtmlBody
      },
      toRecipients: [
        {
          emailAddress: {
            address: params.lead.email.trim(),
            name: params.lead.name || params.lead.firstName || params.lead.email.split("@")[0]
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: effectiveSenderName
        }
      }
    },
    saveToSentItems: true
  };
  if (params.lead.threadId && !params.lead.threadId.startsWith("graph-conv-")) {
    try {
      const threadCheckUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(params.lead.threadId)}'&$top=1&$orderby=sentDateTime desc&$select=id,internetMessageId,subject`;
      const threadRes = await fetch(threadCheckUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        const prevMsg = threadData.value?.[0];
        if (prevMsg?.internetMessageId) {
          emailMessage.message.internetMessageHeaders = [
            { name: "In-Reply-To", value: prevMsg.internetMessageId },
            { name: "References", value: prevMsg.internetMessageId }
          ];
        }
      }
    } catch (e) {
      console.warn("[MS Graph] Could not fetch previous message in conversation for threading headers:", e);
    }
  }
  const sendStartTime = new Date(Date.now() - 5e3);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(emailMessage)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { error: { message: errorText } };
    }
    const msg = parsedErr.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${msg}`);
  }
  const cleanLeadEmail = params.lead.email.trim().toLowerCase();
  let realMessageId = null;
  let realConversationId = null;
  async function querySentItems(attempt = 1) {
    try {
      const sinceISO = sendStartTime.toISOString();
      const queryUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$filter=sentDateTime ge ${encodeURIComponent(sinceISO)}&$orderby=sentDateTime desc&$top=5&$select=id,conversationId,subject,sentDateTime,toRecipients`;
      const sentRes = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const sentMessages = sentData.value || [];
        const exactMatch = sentMessages.find((msg) => {
          const recs = msg.toRecipients || [];
          const matchesTo = recs.some((r) => (r.emailAddress?.address || "").trim().toLowerCase() === cleanLeadEmail);
          const cleanSubject = (msg.subject || "").trim().toLowerCase();
          const cleanTarget = renderedSubject.trim().toLowerCase();
          return matchesTo && (cleanSubject === cleanTarget || cleanSubject.includes(cleanTarget) || cleanTarget.includes(cleanSubject));
        });
        if (exactMatch && exactMatch.conversationId) {
          realMessageId = exactMatch.id;
          realConversationId = exactMatch.conversationId;
          return;
        }
        const recipientMatch = sentMessages.find((msg) => {
          const recs = msg.toRecipients || [];
          return recs.some((r) => (r.emailAddress?.address || "").trim().toLowerCase() === cleanLeadEmail);
        });
        if (recipientMatch && recipientMatch.conversationId) {
          realMessageId = recipientMatch.id;
          realConversationId = recipientMatch.conversationId;
          return;
        }
      }
    } catch (err) {
      console.warn(`[MS Graph] Error querying Sent Items (attempt ${attempt}):`, err);
    }
    if (attempt === 1) {
      await new Promise((r) => setTimeout(r, 1500));
      await querySentItems(2);
    }
  }
  await querySentItems(1);
  const existingRealThreadId = params.lead.threadId && !params.lead.threadId.startsWith("graph-conv-") ? params.lead.threadId : null;
  let threadId = realConversationId || existingRealThreadId;
  let messageId = realMessageId;
  if (!threadId) {
    console.warn(
      `[MS Graph] Warning: Could not locate real conversationId in Sent Items for lead ${params.lead.email} ("${renderedSubject}"). Falling back to secondary sender-email reply matching.`
    );
    threadId = existingRealThreadId || `graph-conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
  if (!messageId) {
    messageId = `graph-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
  return {
    success: true,
    messageId,
    threadId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    to: params.lead.email,
    subject: renderedSubject,
    statusCode: response.status
  };
}
async function checkAppThreadForReply(params) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    return { hasReplied: false, reason: "Service account mailbox not configured" };
  }
  const cleanLeadEmail = (params.leadEmail || "").trim().toLowerCase();
  if (!cleanLeadEmail) {
    return { hasReplied: false, reason: "Missing lead email" };
  }
  const token = await getAppAccessToken();
  const serviceAccount = config.serviceAccount;
  if (params.threadId && !params.threadId.startsWith("graph-conv-")) {
    try {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(params.threadId)}'&$top=25&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const messages = data.value || [];
        messages.sort((a, b) => new Date(b.receivedDateTime || 0).getTime() - new Date(a.receivedDateTime || 0).getTime());
        for (const msg of messages) {
          const senderEmail = (msg.from?.emailAddress?.address || "").toLowerCase().trim();
          if (senderEmail === serviceAccount.toLowerCase()) {
            continue;
          }
          if (senderEmail === cleanLeadEmail || senderEmail.includes(cleanLeadEmail) || cleanLeadEmail.includes(senderEmail)) {
            if (params.lastSentDate) {
              const msgDate = new Date(msg.receivedDateTime).getTime();
              const sentDate = params.lastSentDate.includes("T") ? new Date(params.lastSentDate).getTime() : (/* @__PURE__ */ new Date(`${params.lastSentDate}T00:00:00Z`)).getTime();
              if (!isNaN(sentDate) && !isNaN(msgDate) && msgDate < sentDate - 6e4) {
                continue;
              }
            }
            return {
              hasReplied: true,
              reason: `Reply received from ${cleanLeadEmail} in conversation ${params.threadId}`,
              replyMessage: {
                id: msg.id,
                from: msg.from?.emailAddress?.address || cleanLeadEmail,
                subject: msg.subject || "",
                receivedDateTime: msg.receivedDateTime,
                bodyPreview: msg.bodyPreview
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn("[MS Graph] Conversation reply check failed:", err);
    }
  }
  if (!params.lastSentDate) {
    return { hasReplied: false, reason: "No outreach email sent yet; direct mailbox search omitted" };
  }
  try {
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=from/emailAddress/address eq '${encodeURIComponent(cleanLeadEmail)}'&$top=5&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const messages = data.value || [];
      const sentDate = params.lastSentDate.includes("T") ? new Date(params.lastSentDate).getTime() : (/* @__PURE__ */ new Date(`${params.lastSentDate}T00:00:00Z`)).getTime();
      for (const msg of messages) {
        const msgDate = new Date(msg.receivedDateTime).getTime();
        if (isNaN(msgDate) || isNaN(sentDate) || msgDate <= sentDate) {
          continue;
        }
        return {
          hasReplied: true,
          reason: `Reply message detected from prospect ${cleanLeadEmail}`,
          replyMessage: {
            id: msg.id,
            from: msg.from?.emailAddress?.address || cleanLeadEmail,
            subject: msg.subject || "",
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview
          }
        };
      }
    }
  } catch (err) {
    console.warn("[MS Graph] Direct sender reply check failed:", err);
  }
  return { hasReplied: false };
}
async function getAppConversationThread(threadId, leadEmail) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    return { messages: [], subject: "" };
  }
  const token = await getAppAccessToken();
  const serviceAccount = config.serviceAccount;
  const cleanLeadEmail = (leadEmail || "").trim().toLowerCase();
  let rawMessages = [];
  let threadSubject = "";
  if (threadId && !threadId.startsWith("graph-conv-")) {
    try {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(threadId)}'&$top=50&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,body,internetMessageId`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        rawMessages = data.value || [];
      } else {
        console.warn(`[MS Graph] Failed to query conversation messages for ${threadId}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("[MS Graph] Conversation messages query error:", err);
    }
  }
  if (rawMessages.length === 0 && cleanLeadEmail) {
    try {
      const fromUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=from/emailAddress/address eq '${encodeURIComponent(cleanLeadEmail)}'&$top=20&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,body,internetMessageId`;
      const fromRes = await fetch(fromUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (fromRes.ok) {
        const fromData = await fromRes.json();
        rawMessages = fromData.value || [];
      }
    } catch (err) {
      console.warn("[MS Graph] Fallback messages query error:", err);
    }
  }
  rawMessages.sort((a, b) => {
    const timeA = new Date(a.receivedDateTime || a.sentDateTime || 0).getTime();
    const timeB = new Date(b.receivedDateTime || b.sentDateTime || 0).getTime();
    return timeA - timeB;
  });
  const parsedMessages = rawMessages.map((msg) => {
    const fromAddress = (msg.from?.emailAddress?.address || "").trim();
    const fromName = msg.from?.emailAddress?.name || fromAddress;
    const fromFormatted = fromAddress ? fromName && fromName.toLowerCase() !== fromAddress.toLowerCase() ? `"${fromName}" <${fromAddress}>` : fromAddress : "";
    const toRecipients = msg.toRecipients || [];
    const toFormatted = toRecipients.map((r) => {
      const addr = r.emailAddress?.address || "";
      const name = r.emailAddress?.name || addr;
      return addr ? name && name.toLowerCase() !== addr.toLowerCase() ? `"${name}" <${addr}>` : addr : "";
    }).filter(Boolean).join(", ");
    const subject = msg.subject || "";
    if (!threadSubject && subject) threadSubject = subject;
    const date = msg.receivedDateTime || msg.sentDateTime || (/* @__PURE__ */ new Date()).toISOString();
    const cleanSender = fromAddress.toLowerCase();
    const isServiceAccount = cleanSender === serviceAccount.toLowerCase();
    const isFromLead = cleanLeadEmail ? cleanSender === cleanLeadEmail || !isServiceAccount : !isServiceAccount;
    const bodyHtml = msg.body?.contentType === "html" ? msg.body?.content : void 0;
    const bodyText = msg.body?.contentType === "text" ? msg.body?.content : msg.bodyPreview || "";
    return {
      id: msg.id,
      threadId: msg.conversationId || threadId || "",
      from: fromFormatted,
      to: toFormatted,
      date,
      subject,
      snippet: msg.bodyPreview || "",
      bodyHtml,
      bodyText,
      isFromLead,
      messageIdHeader: msg.internetMessageId || ""
    };
  });
  return {
    messages: parsedMessages,
    subject: threadSubject || (threadId ? `Conversation ${threadId}` : "Email Thread")
  };
}
function getServiceAccountProfile() {
  const config = getGraphConfig();
  const isConfigured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );
  return {
    serviceAccount: config.serviceAccount,
    displayName: config.displayName || "Service Account Mailbox",
    isConfigured,
    provider: "outlook"
  };
}
async function sendDirectTestEmail(to, customSubject, customBody) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    throw new Error("MICROSOFT_GRAPH_SERVICE_ACCOUNT environment variable is not configured.");
  }
  const token = await getAppAccessToken();
  const subject = customSubject || `Outreach Flow Test: App-Only Microsoft Graph Service Account [${(/* @__PURE__ */ new Date()).toLocaleTimeString()}]`;
  const bodyContent = customBody || `
    <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #2563eb;">Outreach Flow - Microsoft Graph Service Account Test</h2>
      <p>This email confirms that application-only (client credentials) authentication and mailbox sending are working properly.</p>
      <ul>
        <li><strong>Sending Mailbox:</strong> ${config.serviceAccount}</li>
        <li><strong>Display Name:</strong> ${config.displayName}</li>
        <li><strong>Timestamp:</strong> ${(/* @__PURE__ */ new Date()).toISOString()}</li>
      </ul>
      <p style="color: #64748b; font-size: 13px;">Sent automatically via Microsoft Graph POST /users/{serviceAccount}/sendMail.</p>
    </div>
  `;
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;
  const emailMessage = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: bodyContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: to.trim()
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: config.displayName
        }
      }
    },
    saveToSentItems: true
  };
  const sendStartTime = new Date(Date.now() - 5e3);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(emailMessage)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(`Test email failed (${response.status}): ${parsed.error?.message || errorText}`);
  }
  let capturedMessageId = null;
  let capturedConversationId = null;
  try {
    const queryUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$filter=sentDateTime ge ${encodeURIComponent(sendStartTime.toISOString())}&$orderby=sentDateTime desc&$top=3&$select=id,conversationId,subject,sentDateTime,toRecipients`;
    const sentRes = await fetch(queryUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (sentRes.ok) {
      const sentData = await sentRes.json();
      const match = (sentData.value || []).find(
        (m) => (m.toRecipients || []).some((r) => (r.emailAddress?.address || "").toLowerCase() === to.trim().toLowerCase())
      );
      if (match) {
        capturedMessageId = match.id;
        capturedConversationId = match.conversationId;
      }
    }
  } catch (lookupErr) {
    console.warn("[MS Graph] Direct test email SentItems lookup skipped:", lookupErr);
  }
  return {
    success: true,
    statusCode: response.status,
    sentTo: to,
    from: config.serviceAccount,
    messageId: capturedMessageId || void 0,
    conversationId: capturedConversationId || void 0,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getWebhookClientState() {
  return (process.env.MICROSOFT_GRAPH_CLIENT_STATE || process.env.GRAPH_WEBHOOK_CLIENT_STATE || "gini_graph_webhook_secret_key_2026").trim();
}
function verifyWebhookClientState(provided, expected) {
  const secret = expected || getWebhookClientState();
  if (!provided || !secret) return false;
  const bufProvided = Buffer.from(provided);
  const bufSecret = Buffer.from(secret);
  if (bufProvided.length !== bufSecret.length) return false;
  return crypto2.timingSafeEqual(bufProvided, bufSecret);
}
async function createGraphWebhookSubscription(customBaseUrl) {
  const config = getGraphConfig();
  const clientState = getWebhookClientState();
  const publicBase = (customBaseUrl || getPublicBaseUrl()).replace(/\/+$/, "");
  const notificationUrl = `${publicBase}/api/webhooks/graph`;
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1e3).toISOString();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.serviceAccount) {
    const mockSub = {
      id: `mock-sub-${Date.now()}`,
      subscriptionId: `mock-sub-${Date.now()}`,
      resource: `users/${config.serviceAccount || "service@example.com"}/mailFolders('Inbox')/messages`,
      changeType: "created",
      clientState,
      notificationUrl,
      expirationDateTime,
      createdAt: now,
      updatedAt: now,
      isMock: true
    };
    const db2 = await getDb().catch(() => null);
    if (db2) {
      await db2.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
        { id: mockSub.id },
        { $set: mockSub },
        { upsert: true }
      );
    }
    return mockSub;
  }
  const token = await getAppAccessToken();
  const endpoint = "https://graph.microsoft.com/v1.0/subscriptions";
  const subPayload = {
    changeType: "created",
    notificationUrl,
    resource: `users/${encodeURIComponent(config.serviceAccount)}/mailFolders('Inbox')/messages`,
    expirationDateTime,
    clientState
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(subPayload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(`Failed to create Microsoft Graph webhook subscription (${response.status}): ${parsed.error?.message || errorText}`);
  }
  const createdSub = await response.json();
  const record = {
    id: createdSub.id,
    subscriptionId: createdSub.id,
    resource: createdSub.resource,
    changeType: createdSub.changeType,
    notificationUrl: createdSub.notificationUrl,
    expirationDateTime: createdSub.expirationDateTime,
    clientState,
    createdAt: now,
    updatedAt: now
  };
  const db = await getDb().catch(() => null);
  if (db) {
    await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
      { id: record.id },
      { $set: record },
      { upsert: true }
    );
  }
  return record;
}
async function renewExpiringGraphSubscriptions(customBaseUrl) {
  const config = getGraphConfig();
  const hasCreds = Boolean(config.tenantId && config.clientId && config.clientSecret && config.serviceAccount);
  const db = await getDb().catch(() => null);
  const renewThresholdMs = 24 * 60 * 60 * 1e3;
  const now = Date.now();
  const newExpiration = new Date(now + 4200 * 60 * 1e3).toISOString();
  let storedSubs = [];
  if (db) {
    storedSubs = await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).find({}).toArray();
  }
  const renewedList = [];
  if (hasCreds) {
    try {
      const token = await getAppAccessToken();
      const listRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const liveSubs = listData.value || [];
        for (const sub of liveSubs) {
          const expTime = new Date(sub.expirationDateTime).getTime();
          if (expTime - now < renewThresholdMs) {
            const patchRes = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(sub.id)}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ expirationDateTime: newExpiration })
            });
            if (patchRes.ok) {
              const updated = await patchRes.json();
              renewedList.push({ ...updated, renewed: true });
              if (db) {
                await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
                  { id: sub.id },
                  { $set: { ...updated, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
                  { upsert: true }
                );
              }
            } else {
              console.warn(`[MS Graph] Failed to renew subscription ${sub.id}: HTTP ${patchRes.status}`);
            }
          } else {
            renewedList.push({ ...sub, renewed: false, reason: "Not yet nearing expiration" });
          }
        }
        if (liveSubs.length === 0) {
          const fresh = await createGraphWebhookSubscription(customBaseUrl);
          renewedList.push({ ...fresh, created: true });
        }
      }
    } catch (err) {
      console.warn("[MS Graph] Subscription renewal API call failed:", err);
    }
  } else {
    for (const sub of storedSubs) {
      const expTime = new Date(sub.expirationDateTime).getTime();
      if (expTime - now < renewThresholdMs) {
        const updated = { ...sub, expirationDateTime: newExpiration, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        if (db) {
          await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne({ id: sub.id }, { $set: updated });
        }
        renewedList.push({ ...updated, renewed: true });
      } else {
        renewedList.push({ ...sub, renewed: false, reason: "Not yet nearing expiration" });
      }
    }
    if (storedSubs.length === 0) {
      const fresh = await createGraphWebhookSubscription(customBaseUrl);
      renewedList.push({ ...fresh, created: true });
    }
  }
  return renewedList;
}
async function fetchGraphMessageDetails(messageId) {
  const config = getGraphConfig();
  if (!config.serviceAccount) return null;
  try {
    const token = await getAppAccessToken();
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,body`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[MS Graph] Failed to fetch message details for", messageId, err);
  }
  return null;
}
async function processGraphWebhookNotification(notification) {
  const expectedSecret = getWebhookClientState();
  if (!verifyWebhookClientState(notification.clientState, expectedSecret)) {
    throw new Error("Unauthorized: clientState does not match expected secret.");
  }
  let messageId = notification.resourceData?.id;
  if (!messageId && notification.resource) {
    const parts = notification.resource.split("/");
    messageId = parts[parts.length - 1];
  }
  let fromEmail = "";
  let fromName = "";
  let subject = notification.subject || "";
  let bodyPreview = notification.bodyPreview || "";
  let conversationId = notification.conversationId || "";
  let receivedDateTime = notification.receivedDateTime || (/* @__PURE__ */ new Date()).toISOString();
  if (notification.leadEmail || notification.from) {
    fromEmail = (notification.from || notification.leadEmail || "").trim().toLowerCase();
    subject = notification.subject || subject;
    bodyPreview = notification.body || notification.bodyPreview || bodyPreview;
    conversationId = notification.threadId || notification.conversationId || conversationId;
  } else if (messageId) {
    const msg = await fetchGraphMessageDetails(messageId);
    if (msg) {
      fromEmail = (msg.from?.emailAddress?.address || "").trim().toLowerCase();
      fromName = msg.from?.emailAddress?.name || "";
      subject = msg.subject || "";
      bodyPreview = msg.bodyPreview || (msg.body?.content ? msg.body.content.replace(/<[^>]+>/g, " ") : "");
      conversationId = msg.conversationId || "";
      receivedDateTime = msg.receivedDateTime || receivedDateTime;
    }
  }
  const config = getGraphConfig();
  if (config.serviceAccount && fromEmail.toLowerCase() === config.serviceAccount.toLowerCase()) {
    return { skipped: true, reason: "Outbound email sent by service account" };
  }
  const replyResult = await applyLeadReply({
    leadEmail: fromEmail,
    threadId: conversationId,
    messageId: messageId || `graph-msg-${Date.now()}`,
    subject,
    body: bodyPreview,
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    receivedDateTime,
    source: "Microsoft Graph Webhook"
  });
  return replyResult;
}

// server/runnerBackend.ts
init_templateBackend();
init_mongodb();
async function checkLeadForReply(lead, _token, _userEmail, _sender) {
  if (lead.status === "Replied") {
    return { hasReplied: true, reason: "Status already marked Replied" };
  }
  if (lead.status === "Negative Reply") {
    return { hasReplied: true, reason: "Status marked Negative Reply (do not contact)" };
  }
  if (lead.hasReplied === true || lead.hasUnreadReply === true || lead.lastReplyReceivedDate) {
    return { hasReplied: true, reason: "Incoming reply flag detected on lead record" };
  }
  if (!lead.lastEmailSentDate && !lead.threadId && (lead.currentStage || 0) === 0) {
    return { hasReplied: false, reason: "No outreach email dispatched to this lead yet" };
  }
  try {
    const res = await checkAppThreadForReply({
      leadEmail: lead.email,
      threadId: lead.threadId,
      lastSentDate: lead.lastEmailSentDate
    });
    if (res.hasReplied) {
      const fromInfo = res.replyMessage?.from ? ` (${res.replyMessage.from})` : "";
      return {
        hasReplied: true,
        reason: `Lead reply detected in Microsoft Graph service account mailbox${fromInfo}`,
        replyMessage: res.replyMessage
      };
    }
  } catch (err) {
    console.warn(`Error checking thread for reply on lead ${lead.email} via Graph:`, err);
  }
  return { hasReplied: false };
}
function isWithinSendingSchedule(schedule) {
  if (!schedule) return { allowed: true };
  const now = /* @__PURE__ */ new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const allowedDays = schedule.allowedDays || schedule.days;
  if (Array.isArray(allowedDays) && allowedDays.length > 0) {
    if (!allowedDays.includes(currentDay)) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        allowed: false,
        reason: `Current day is ${dayNames[currentDay]}, which is outside allowed days [${allowedDays.map((d) => dayNames[d] || d).join(", ")}]`
      };
    }
  }
  if (typeof schedule.startHour === "number" && currentHour < schedule.startHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is earlier than allowed start hour (${schedule.startHour}:00)`
    };
  }
  if (typeof schedule.endHour === "number" && currentHour >= schedule.endHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is at or past allowed end hour (${schedule.endHour}:00)`
    };
  }
  return { allowed: true };
}
function getStepDelayMs(value, unit) {
  if (typeof value !== "number" || isNaN(value) || value <= 0) return 0;
  switch (unit) {
    case "seconds":
      return value * 1e3;
    case "minutes":
      return value * 60 * 1e3;
    case "hours":
      return value * 60 * 60 * 1e3;
    case "days":
      return value * 24 * 60 * 60 * 1e3;
    default:
      return value * 60 * 1e3;
  }
}
function parseNodeEnteredTime(dateStr, fallbackMs = Date.now()) {
  if (!dateStr) return fallbackMs;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? fallbackMs : parsed;
}
async function runDueCampaignsJob(targetCampaignId, token, spreadsheetId, userEmail) {
  const campaigns = await listCampaigns(token, spreadsheetId);
  const leads = await listLeads(token, spreadsheetId);
  const senders = await loadLocalSenders();
  const logs = [];
  let processedCount = 0;
  let emailsSent = 0;
  let tasksCreated = 0;
  let advancedCount = 0;
  const activeCampaigns = campaigns.filter((c) => {
    const isActive = Boolean(c.is_active ?? c.isActive);
    if (!isActive) {
      if (targetCampaignId && c.id === targetCampaignId) {
        logs.push(`Campaign "${c.name}" (ID: ${c.id}) is marked Inactive. Inactive campaigns are NEVER touched by this job.`);
      }
      return false;
    }
    if (targetCampaignId) return c.id === targetCampaignId;
    return true;
  });
  const inactiveCount = campaigns.filter((c) => !Boolean(c.is_active ?? c.isActive)).length;
  logs.push(`Found ${activeCampaigns.length} active campaign(s) to process. (${inactiveCount} inactive campaign(s) skipped).`);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const nowMs = Date.now();
  for (const campaign of activeCampaigns) {
    logs.push(`--- Evaluating Campaign: "${campaign.name}" (ID: ${campaign.id}) ---`);
    const graph = campaign.workflow_graph || { nodes: [], edges: [] };
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    if (nodes.length === 0) {
      logs.push(`Campaign "${campaign.name}" has no nodes configured in workflow canvas.`);
      continue;
    }
    const startNode = nodes.find((n) => n.data?.nodeType === "start" || n.type === "start" || n.type === "startNode");
    const campaignLeads = leads.filter((l) => {
      if (l.status === "Paused" || l.status === "Completed" || l.status === "Broke Up" || l.status === "Replied" || l.status === "Negative Reply") {
        return false;
      }
      return l.campaignId === campaign.id || l.campaign === campaign.name;
    });
    logs.push(`Assigned leads found for "${campaign.name}": ${campaignLeads.length}`);
    for (const lead of campaignLeads) {
      processedCount++;
      let currentNode = nodes.find((n) => n.id === lead.currentNodeId);
      if (!currentNode) {
        if (startNode) {
          const firstEdge = edges.find((e) => e.source === startNode.id);
          if (firstEdge) {
            currentNode = nodes.find((n) => n.id === firstEdge.target);
          } else {
            currentNode = startNode;
          }
        } else if (nodes.length > 0) {
          currentNode = nodes[0];
        }
        if (currentNode) {
          lead.campaignId = campaign.id;
          lead.campaign = campaign.name;
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
          const initDelayMs = getStepDelayMs(currentNode.data?.stepDelayValue, currentNode.data?.stepDelayUnit);
          if (initDelayMs > 0) {
            lead.nextSendDate = new Date(nowMs + initDelayMs).toISOString().split("T")[0];
          } else {
            lead.nextSendDate = todayStr;
          }
          await updateLead(lead, token, spreadsheetId);
          logs.push(`Initialized lead ${lead.name} into node "${currentNode.data?.label || currentNode.id}".`);
        }
      }
      if (!currentNode) continue;
      let rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
      if (rawNodeType.endsWith("Node")) {
        rawNodeType = rawNodeType.replace("Node", "");
      }
      const incomingNoEdge = edges.find(
        (e) => e.target === currentNode.id && (e.sourceHandle === "no" || e.data?.conditionOutcome === "no")
      );
      if (incomingNoEdge) {
        const condNode = nodes.find((n) => n.id === incomingNoEdge.source);
        if (condNode) {
          const condType = condNode.data?.conditionType || "has_replied";
          let isNowSatisfied = false;
          if (condType === "has_replied") {
            isNowSatisfied = lead.status === "Replied" || Boolean(lead.hasReplied);
          } else if (condType === "email_opened") {
            isNowSatisfied = (lead.opensCount || 0) > 0;
          } else if (condType === "link_clicked") {
            isNowSatisfied = (lead.clicksCount || 0) > 0;
          } else if (condType === "has_linkedin_url") {
            isNowSatisfied = Boolean(lead.linkedinUrl && String(lead.linkedinUrl).trim().length > 0);
          }
          if (isNowSatisfied) {
            let alreadyExecuted = false;
            if (rawNodeType === "email") {
              const stageNum = currentNode.data?.templateStage || lead.currentStage + 1;
              if (lead.currentStage >= stageNum) {
                alreadyExecuted = true;
              }
            }
            if (!alreadyExecuted) {
              const yesEdge = edges.find(
                (e) => e.source === condNode.id && (e.sourceHandle === "yes" || e.data?.conditionOutcome === "yes")
              );
              if (yesEdge) {
                const yesTarget = nodes.find((n) => n.id === yesEdge.target);
                if (yesTarget) {
                  const prevLabel = currentNode.data?.label || currentNode.id;
                  lead.currentNodeId = yesTarget.id;
                  lead.nodeEnteredDate = lead.lastOpenedDate || lead.lastClickedDate || (/* @__PURE__ */ new Date()).toISOString();
                  const nextDelayMs = getStepDelayMs(yesTarget.data?.stepDelayValue, yesTarget.data?.stepDelayUnit);
                  if (nextDelayMs > 0) {
                    lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
                  } else {
                    lead.nextSendDate = todayStr;
                  }
                  await updateLead(lead, token, spreadsheetId);
                  logs.push(
                    `Lead ${lead.name} satisfied condition "${condType}" (event recorded) while queued on NO path at "${prevLabel}". Retroactively switched to YES branch: "${yesTarget.data?.label || yesTarget.id}".`
                  );
                  currentNode = yesTarget;
                  rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
                  if (rawNodeType.endsWith("Node")) {
                    rawNodeType = rawNodeType.replace("Node", "");
                  }
                  advancedCount++;
                }
              }
            }
          }
        }
      }
      const leadSender = senders.find((s) => s.email === lead.senderUsed || s.id === lead.senderUsed) || senders.find((s) => s.isPrimary) || senders[0];
      const replyCheck = await checkLeadForReply(lead, token, userEmail, leadSender);
      if (replyCheck.hasReplied) {
        if (replyCheck.replyMessage) {
          const applyRes = await applyLeadReply({
            leadEmail: lead.email,
            threadId: lead.threadId,
            messageId: replyCheck.replyMessage?.id,
            subject: replyCheck.replyMessage?.subject || "Re: Outreach Flow follow-up",
            body: replyCheck.replyMessage?.bodyPreview || "",
            from: replyCheck.replyMessage?.from || lead.email,
            receivedDateTime: replyCheck.replyMessage?.receivedDateTime,
            source: "Campaign Runner Check"
          });
          if (applyRes.lead) {
            Object.assign(lead, applyRes.lead);
          }
        }
        if (lead.status !== "Negative Reply") {
          lead.status = "Replied";
        }
        await updateLead(lead, token, spreadsheetId);
        logs.push(
          `Reply check for lead ${lead.name} (${lead.email}): Reply detected (sentiment: ${lead.replySentiment || "neutral"}). Sequence halted.`
        );
        continue;
      }
      if (rawNodeType !== "condition") {
        const stepDelayMs = getStepDelayMs(currentNode.data?.stepDelayValue, currentNode.data?.stepDelayUnit);
        if (stepDelayMs > 0) {
          const enteredMs = parseNodeEnteredTime(lead.nodeEnteredDate, nowMs);
          const elapsedMs = nowMs - enteredMs;
          if (elapsedMs < stepDelayMs) {
            const remainingSec = Math.ceil((stepDelayMs - elapsedMs) / 1e3);
            const unit = currentNode.data?.stepDelayUnit || "minutes";
            const val = currentNode.data?.stepDelayValue;
            logs.push(
              `Step delay active on node "${currentNode.data?.label || currentNode.id}" for ${lead.name} (${val} ${unit}). Elapsed: ${Math.max(0, Math.floor(elapsedMs / 1e3))}s / Required: ${Math.floor(stepDelayMs / 1e3)}s (${remainingSec}s remaining). Postponing execution.`
            );
            continue;
          }
        }
      }
      if (rawNodeType === "wait") {
        const waitDuration = currentNode.data?.waitDuration ?? currentNode.data?.waitDays ?? 1;
        const waitUnit = currentNode.data?.waitUnit || "days";
        const enteredDate = parseNodeEnteredTime(lead.nodeEnteredDate, nowMs);
        let elapsed = 0;
        if (waitUnit === "hours") {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60 * 60));
        } else if (waitUnit === "minutes") {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60));
        } else {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60 * 60 * 24));
        }
        if (elapsed >= waitDuration) {
          const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge2) {
            const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
            if (nextNode) {
              lead.currentNodeId = nextNode.id;
              lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
              const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
              if (nextDelayMs > 0) {
                lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
                logs.push(
                  `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advanced from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`
                );
                await updateLead(lead, token, spreadsheetId);
                advancedCount++;
                continue;
              } else {
                lead.nextSendDate = todayStr;
                logs.push(
                  `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advancing from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}".`
                );
                await updateLead(lead, token, spreadsheetId);
                currentNode = nextNode;
                rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
                if (rawNodeType.endsWith("Node")) {
                  rawNodeType = rawNodeType.replace("Node", "");
                }
                advancedCount++;
              }
            } else {
              logs.push(`Wait node "${currentNode.id}" has invalid target node. Halting.`);
              continue;
            }
          } else {
            logs.push(`Wait node "${currentNode.id}" has no outgoing edge. Halting.`);
            continue;
          }
        } else {
          logs.push(
            `Lead ${lead.name} is waiting in "${currentNode.data?.label || "Wait"}" (${elapsed}/${waitDuration} ${waitUnit} elapsed).`
          );
          continue;
        }
      }
      if (rawNodeType === "condition") {
        const conditionType = currentNode.data?.conditionType || "has_replied";
        let conditionMet = false;
        if (conditionType === "has_replied") {
          conditionMet = lead.status === "Replied" || Boolean(lead.hasReplied);
        } else if (conditionType === "email_opened") {
          conditionMet = (lead.opensCount || 0) > 0;
        } else if (conditionType === "link_clicked") {
          conditionMet = (lead.clicksCount || 0) > 0;
        } else if (conditionType === "has_linkedin_url") {
          conditionMet = Boolean(lead.linkedinUrl && String(lead.linkedinUrl).trim().length > 0);
        }
        const stepDelayMs = getStepDelayMs(currentNode.data?.stepDelayValue, currentNode.data?.stepDelayUnit);
        const enteredMs = parseNodeEnteredTime(lead.nodeEnteredDate, nowMs);
        const elapsedMs = nowMs - enteredMs;
        if (!conditionMet && stepDelayMs > 0 && elapsedMs < stepDelayMs) {
          const remainingSec = Math.ceil((stepDelayMs - elapsedMs) / 1e3);
          const unit = currentNode.data?.stepDelayUnit || "minutes";
          const val = currentNode.data?.stepDelayValue;
          logs.push(
            `Condition "${conditionType}" evaluation window active for ${lead.name} (${val} ${unit}). Elapsed: ${Math.max(0, Math.floor(elapsedMs / 1e3))}s / Window: ${Math.floor(stepDelayMs / 1e3)}s (${remainingSec}s remaining). Waiting for event before routing.`
          );
          continue;
        }
        const handleId = conditionMet ? "yes" : "no";
        const branchEdge = edges.find(
          (e) => e.source === currentNode.id && (e.sourceHandle === handleId || !e.sourceHandle)
        );
        if (branchEdge) {
          const nextNode = nodes.find((n) => n.id === branchEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
              logs.push(
                `Condition "${conditionType}" evaluated to ${conditionMet ? "YES" : "NO"} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`
              );
            } else {
              lead.nextSendDate = todayStr;
              logs.push(
                `Condition "${conditionType}" evaluated to ${conditionMet ? "YES" : "NO"} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}".`
              );
            }
            await updateLead(lead, token, spreadsheetId);
            advancedCount++;
          }
        }
        continue;
      }
      if (rawNodeType === "manual_task" || rawNodeType === "manualTask") {
        const localTasks = await loadLocalTasks();
        const existingTask = localTasks.find(
          (t) => t.nodeId === currentNode.id && (t.leadId === lead.leadId || !t.leadId && t.leadEmail && lead.email && t.leadEmail.toLowerCase() === lead.email.toLowerCase())
        );
        if (!existingTask) {
          tasksCreated++;
          const firstName = lead.firstName || lead.name?.split(" ")[0] || lead.name || "prospect";
          const rawTitle = currentNode.data?.taskTitle || currentNode.data?.label || "Call {{first_name}}";
          const rawDesc = currentNode.data?.taskDescription || "Direct outreach call regarding {{pain_point}}";
          const title = rawTitle.replace(/\{\{first_name\}\}/gi, firstName).replace(/\{\{name\}\}/gi, lead.name || "").replace(/\{\{company\}\}/gi, lead.company || "").replace(/\{\{pain_point\}\}/gi, lead.painPoint || "");
          const instruction = rawDesc.replace(/\{\{first_name\}\}/gi, firstName).replace(/\{\{name\}\}/gi, lead.name || "").replace(/\{\{company\}\}/gi, lead.company || "").replace(/\{\{pain_point\}\}/gi, lead.painPoint || "");
          const dueDateOffset = typeof currentNode.data?.taskDueDateOffsetDays === "number" ? currentNode.data.taskDueDateOffsetDays : 1;
          const dueDateTime = new Date(Date.now() + dueDateOffset * 86400 * 1e3);
          const dueDateStr = dueDateTime.toISOString().split("T")[0];
          const newTask = {
            id: `task-${Date.now()}-${lead.leadId}`,
            leadId: lead.leadId,
            leadName: lead.name,
            leadEmail: lead.email,
            company: lead.company || "",
            leadCompany: lead.company || "",
            campaignId: campaign.id,
            campaignName: campaign.name,
            nodeId: currentNode.id,
            title,
            instruction,
            description: instruction,
            type: currentNode.data?.taskType || "call",
            dueDate: dueDateStr,
            priority: currentNode.data?.taskPriority || "medium",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isCompleted: false
          };
          localTasks.push(newTask);
          await saveLocalTasks(localTasks);
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
          await updateLead(lead, token, spreadsheetId);
          logs.push(`Generated Manual Task for ${lead.name}: "${title}". Sequence paused until completed in Tasks tab.`);
          continue;
        }
        if (!existingTask.isCompleted) {
          logs.push(`Waiting for manual task completion: "${existingTask.title}" for ${lead.name}. Sequence paused.`);
          continue;
        }
        const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge2) {
          const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
              logs.push(`Manual Task "${existingTask.title}" completed. Advanced ${lead.name} to "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`);
              await updateLead(lead, token, spreadsheetId);
              advancedCount++;
              continue;
            } else {
              lead.nextSendDate = todayStr;
              logs.push(`Manual Task "${existingTask.title}" completed. Advanced ${lead.name} to "${nextNode.data?.label || nextNode.id}".`);
              await updateLead(lead, token, spreadsheetId);
              currentNode = nextNode;
              rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
              if (rawNodeType.endsWith("Node")) {
                rawNodeType = rawNodeType.replace("Node", "");
              }
              advancedCount++;
            }
          }
        }
      }
      if (rawNodeType === "email") {
        if (lead.status === "Negative Reply") {
          logs.push(`Safety Refusal: Refusing to email lead ${lead.name} (${lead.email}) - status is "Negative Reply" (do not contact).`);
          continue;
        }
        const senderId = startNode?.data?.senderId || currentNode.data?.senderId || currentNode.data?.senderEmail || "sender-primary";
        const sender = senders.find((s) => s.id === senderId || s.email === senderId) || senders.find((s) => s.isPrimary) || senders[0];
        if (sender) {
          const dailyLimit = typeof sender.dailySendLimit === "number" ? sender.dailySendLimit : 150;
          const sendsToday = typeof sender.sendsToday === "number" ? sender.sendsToday : 0;
          if (sendsToday >= dailyLimit) {
            logs.push(
              `Connected sender "${sender.name}" (${sender.email}) has reached daily send limit (${sendsToday}/${dailyLimit}). Postponing send for ${lead.name}.`
            );
            continue;
          }
        }
        const allowedSchedule = startNode?.data?.schedule;
        const scheduleCheck = isWithinSendingSchedule(allowedSchedule);
        if (!scheduleCheck.allowed) {
          logs.push(
            `Outside Schedule node's window for campaign "${campaign.name}": ${scheduleCheck.reason}. Postponing send for ${lead.name}.`
          );
          continue;
        }
        if (lead.lastEmailSentDate === todayStr) {
          logs.push(`Lead ${lead.name} already received an email today (${todayStr}). Skipping duplicate send.`);
          continue;
        }
        const stageNum = currentNode.data?.templateStage || lead.currentStage + 1;
        const sendFromAccount = sender ? sender.email : currentNode.data?.senderEmail || userEmail || "Default Inbox";
        const resolved = await resolveEmailContent(
          { ...lead, campaignId: campaign.id },
          currentNode
        );
        const template = {
          stage: resolved.stage || stageNum,
          name: `Stage ${resolved.stage || stageNum}`,
          purpose: "Outreach",
          defaultGapDays: 3,
          subject: resolved.subject,
          bodyHtml: resolved.bodyHtml
        };
        const baseUrl = getPublicBaseUrl();
        try {
          const sendResult = await sendAppEmail({
            lead,
            template,
            stageNum,
            senderDisplayName: sender?.name,
            baseUrl
          });
          lead.threadId = sendResult.threadId;
          try {
            const db = await getDb().catch(() => null);
            if (db) {
              const cleanBody = (template.bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              await db.collection("sent_emails").updateOne(
                { id: sendResult.messageId },
                {
                  $set: {
                    id: sendResult.messageId,
                    leadId: lead.leadId,
                    leadEmail: lead.email.toLowerCase(),
                    threadId: sendResult.threadId || lead.threadId || "",
                    from: sender?.name ? `"${sender.name}" <${sendFromAccount}>` : `Outreach Flow <${sendFromAccount}>`,
                    to: lead.email,
                    subject: sendResult.subject || template.subject,
                    bodyHtml: template.bodyHtml,
                    bodyText: cleanBody,
                    snippet: cleanBody.substring(0, 160),
                    date: (/* @__PURE__ */ new Date()).toISOString(),
                    stage: stageNum,
                    campaign: lead.campaign || "",
                    isFromLead: false
                  }
                },
                { upsert: true }
              );
            }
          } catch (_) {
          }
        } catch (sendErr) {
          logs.push(`Email dispatch to ${lead.name} failed via Graph: ${sendErr.message}. Skipping advance.`);
          continue;
        }
        if (sender) {
          sender.sendsToday = (sender.sendsToday || 0) + 1;
          sender.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
          await saveLocalSenders(senders);
        }
        emailsSent++;
        lead.lastEmailSentDate = (/* @__PURE__ */ new Date()).toISOString();
        lead.senderUsed = sendFromAccount;
        lead.currentStage = stageNum;
        const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge2) {
          const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
              logs.push(
                `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}" (due after ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit}).`
              );
            } else {
              lead.nextSendDate = todayStr;
              logs.push(
                `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}".`
              );
            }
            advancedCount++;
          } else {
            lead.status = "Completed";
            lead.nextSendDate = "";
            lead.currentNodeId = void 0;
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
            );
          }
        } else {
          lead.status = "Completed";
          lead.nextSendDate = "";
          lead.currentNodeId = void 0;
          logs.push(
            `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
          );
        }
        await updateLead(lead, token, spreadsheetId);
        continue;
      }
      const outgoingEdge = edges.find((e) => e.source === currentNode.id);
      if (outgoingEdge) {
        const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
        if (nextNode) {
          lead.currentNodeId = nextNode.id;
          lead.nodeEnteredDate = (/* @__PURE__ */ new Date()).toISOString();
          const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
          if (nextDelayMs > 0) {
            lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split("T")[0];
            logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}" (due after ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit}).`);
          } else {
            lead.nextSendDate = todayStr;
            logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}".`);
          }
          await updateLead(lead, token, spreadsheetId);
          advancedCount++;
        }
      }
    }
  }
  return {
    success: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    activeCampaignsCount: activeCampaigns.length,
    processedLeadsCount: processedCount,
    emailsSentCount: emailsSent,
    tasksCreatedCount: tasksCreated,
    advancedNodesCount: advancedCount,
    logs
  };
}

// server/app.ts
init_defaultTemplates();
init_templateBackend();

// server/authMiddleware.ts
init_auth();

// server/permissions.ts
var ROLE_PERMISSIONS = {
  admin: [
    "users.manage",
    "users.changeRoles",
    "leads.create",
    "leads.viewAll",
    "leads.reassign",
    "leads.deleteOwn",
    "leads.deleteAny",
    "campaigns.create",
    "campaigns.run",
    "campaigns.editOwn",
    "campaigns.editAny",
    "templates.editOwn",
    "templates.editAny",
    "templates.editDefault",
    "templates.editHeaderFooter",
    "settings.edit"
  ],
  user: [
    "leads.create",
    "leads.deleteOwn",
    "campaigns.create",
    "campaigns.run",
    "campaigns.editOwn",
    "templates.editOwn"
  ]
};
function getPermissionsForRole(role) {
  if (role in ROLE_PERMISSIONS) {
    return [...ROLE_PERMISSIONS[role]];
  }
  return [];
}

// server/authMiddleware.ts
init_mongodb();
function isPublicRoute(path2) {
  if (path2 === "/api/health") return true;
  if (path2 === "/api/auth/login") return true;
  if (path2 === "/api/auth/logout") return true;
  if (path2 === "/api/track/open" || path2.startsWith("/api/track/open/")) return true;
  if (path2 === "/api/track/click") return true;
  if (path2 === "/api/webhooks/graph") return true;
  if (path2.startsWith("/api/cron/")) return true;
  if (path2 === "/api/email/inbound-reply") return true;
  return false;
}
async function requireAuth(req, res, next) {
  if (isPublicRoute(req.path)) {
    return next();
  }
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Session missing or expired"
    });
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    clearSessionCookie(res);
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Session missing or expired"
    });
  }
  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ id: payload.userId });
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: User account not found"
      });
    }
    if (!user.isActive) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Account is deactivated"
      });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: Boolean(user.mustChangePassword),
      permissions: getPermissionsForRole(user.role)
    };
    return next();
  } catch (err) {
    console.error("[Auth Middleware] Database verification error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal authentication error"
    });
  }
}
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Session missing or expired"
      });
    }
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Missing required permission "${permission}"`
      });
    }
    return next();
  };
}
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Session missing or expired"
    });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Admin access required"
    });
  }
  return next();
}

// server/app.ts
init_auth();

// server/userBackend.ts
init_mongodb();
init_auth();
async function listUsers() {
  const db = await getDb();
  const users = await db.collection("users").find({}).sort({ createdAt: -1 }).toArray();
  return users.map(sanitizeUser);
}
async function createUser(input) {
  const db = await getDb();
  const usersCol = db.collection("users");
  const cleanEmail = (input.email || "").toLowerCase().trim();
  const cleanName = (input.name || "").trim();
  const role = input.role === "admin" ? "admin" : "user";
  if (!cleanEmail || !cleanName) {
    throw new Error("Name and email are required");
  }
  const existing = await usersCol.findOne({ email: cleanEmail });
  if (existing) {
    throw new Error(`A user with email "${cleanEmail}" already exists`);
  }
  const rawPassword = input.password || "TempPassword123!";
  const passwordHash = await hashPassword(rawPassword);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userDoc = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role,
    isActive: true,
    mustChangePassword: input.mustChangePassword !== false,
    // default true for admin-created users
    createdAt: now,
    lastLoginAt: null
  };
  await usersCol.insertOne(userDoc);
  try {
    const { createTemplateSetForNewUser: createTemplateSetForNewUser2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
    await createTemplateSetForNewUser2(userDoc.id, userDoc.name);
  } catch (tErr) {
    console.warn("[UserBackend] Failed to create template set for new user:", tErr);
  }
  return sanitizeUser(userDoc);
}
async function toggleUserActive(targetUserId, requestingUserId) {
  const db = await getDb();
  const usersCol = db.collection("users");
  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: "User not found" };
  }
  if (targetUserId === requestingUserId && target.isActive) {
    return { success: false, error: "You cannot deactivate your own account." };
  }
  if (target.isActive && target.role === "admin") {
    const activeAdminsCount = await usersCol.countDocuments({
      role: "admin",
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: "Cannot deactivate the last active administrator." };
    }
  }
  const newStatus = !target.isActive;
  await usersCol.updateOne({ id: targetUserId }, { $set: { isActive: newStatus } });
  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : void 0 };
}
async function changeUserRole(targetUserId, newRole, requestingUserId) {
  const db = await getDb();
  const usersCol = db.collection("users");
  if (newRole !== "admin" && newRole !== "user") {
    return { success: false, error: 'Invalid role. Allowed roles are "admin" or "user".' };
  }
  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: "User not found" };
  }
  if (target.role === newRole) {
    return { success: true, user: sanitizeUser(target) };
  }
  if (targetUserId === requestingUserId && target.role === "admin" && newRole !== "admin") {
    return { success: false, error: "You cannot demote yourself from administrator." };
  }
  if (target.role === "admin" && newRole !== "admin" && target.isActive) {
    const activeAdminsCount = await usersCol.countDocuments({
      role: "admin",
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: "Cannot demote the last active administrator." };
    }
  }
  await usersCol.updateOne({ id: targetUserId }, { $set: { role: newRole } });
  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : void 0 };
}
async function resetUserPassword(targetUserId, newPassword) {
  const db = await getDb();
  const usersCol = db.collection("users");
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }
  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: "User not found" };
  }
  const passwordHash = await hashPassword(newPassword);
  await usersCol.updateOne(
    { id: targetUserId },
    {
      $set: {
        passwordHash,
        mustChangePassword: true
      }
    }
  );
  const updated = await usersCol.findOne({ id: targetUserId });
  return { success: true, user: updated ? sanitizeUser(updated) : void 0 };
}
async function changeOwnPassword(userId, oldPassword, newPassword) {
  const db = await getDb();
  const usersCol = db.collection("users");
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }
  const user = await usersCol.findOne({ id: userId });
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const isOldValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isOldValid) {
    return { success: false, error: "Current password is incorrect." };
  }
  const passwordHash = await hashPassword(newPassword);
  await usersCol.updateOne(
    { id: userId },
    {
      $set: {
        passwordHash,
        mustChangePassword: false
      }
    }
  );
  const updated = await usersCol.findOne({ id: userId });
  return { success: true, user: updated ? sanitizeUser(updated) : void 0 };
}
async function deleteUser(targetUserId, reassignToUserId, requestingUserId) {
  const db = await getDb();
  const usersCol = db.collection("users");
  if (targetUserId === requestingUserId) {
    return { success: false, error: "You cannot delete your own account." };
  }
  const target = await usersCol.findOne({ id: targetUserId });
  if (!target) {
    return { success: false, error: "Target user not found" };
  }
  if (target.role === "admin" && target.isActive) {
    const activeAdminsCount = await usersCol.countDocuments({
      role: "admin",
      isActive: true
    });
    if (activeAdminsCount <= 1) {
      return { success: false, error: "Cannot delete the last active administrator." };
    }
  }
  if (!reassignToUserId || reassignToUserId === targetUserId) {
    return { success: false, error: "A different active user must be chosen to inherit leads and campaigns." };
  }
  const replacement = await usersCol.findOne({ id: reassignToUserId });
  if (!replacement || !replacement.isActive) {
    return { success: false, error: "Replacement user not found or inactive." };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const leadsCol = db.collection("leads");
  const targetLeads = await leadsCol.find({ ownerId: targetUserId }).toArray();
  for (const l of targetLeads) {
    const auditNote = `[Reassigned from ${target.name} (${target.id}) to ${replacement.name} (${replacement.id}) on account deletion by ${requestingUserId} on ${now}]`;
    const newNotes = l.notes && l.notes.trim() ? `${l.notes.trim()} | ${auditNote}` : auditNote;
    await leadsCol.updateOne(
      { leadId: l.leadId },
      {
        $set: {
          ownerId: replacement.id,
          ownerName: replacement.name,
          lastModifiedBy: requestingUserId,
          notes: newNotes,
          updatedAt: now
        }
      }
    );
  }
  const campaignsCol = db.collection("campaigns");
  const campaignRes = await campaignsCol.updateMany(
    { ownerId: targetUserId },
    {
      $set: {
        ownerId: replacement.id,
        ownerName: replacement.name,
        lastEditedBy: requestingUserId,
        updated_date: now
      }
    }
  );
  await usersCol.deleteOne({ id: targetUserId });
  try {
    const { deleteUserTemplateSet: deleteUserTemplateSet2 } = await Promise.resolve().then(() => (init_templateBackend(), templateBackend_exports));
    await deleteUserTemplateSet2(targetUserId);
  } catch (tErr) {
    console.warn("[UserBackend] Failed to delete personal template set on user deletion:", tErr);
  }
  return {
    success: true,
    reassignedLeads: targetLeads.length,
    reassignedCampaigns: campaignRes.modifiedCount
  };
}

// server/app.ts
var app = express();
seedInitialUsers().catch((err) => console.error("[Auth Seeder] Startup error:", err));
app.set("trust proxy", true);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(requireAuth);
var TRANSPARENT_GIF_1X1 = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);
function computeStatsByLead(evts) {
  const stats = {};
  for (const ev of evts) {
    if (!ev.leadId && !ev.email) continue;
    const primaryKey = ev.leadId || ev.email || "";
    if (!stats[primaryKey]) {
      stats[primaryKey] = {
        opensCount: 0,
        clicksCount: 0,
        events: []
      };
    }
    const item = stats[primaryKey];
    item.events.push(ev);
    if (ev.type === "open") {
      item.opensCount++;
      if (!item.firstOpenedDate || new Date(ev.timestamp) < new Date(item.firstOpenedDate)) {
        item.firstOpenedDate = ev.timestamp;
      }
      if (!item.lastOpenedDate || new Date(ev.timestamp) > new Date(item.lastOpenedDate)) {
        item.lastOpenedDate = ev.timestamp;
      }
    } else if (ev.type === "click") {
      item.clicksCount++;
      if (!item.firstClickedDate || new Date(ev.timestamp) < new Date(item.firstClickedDate)) {
        item.firstClickedDate = ev.timestamp;
      }
      if (!item.lastClickedDate || new Date(ev.timestamp) > new Date(item.lastClickedDate)) {
        item.lastClickedDate = ev.timestamp;
      }
    }
    if (ev.email && ev.email.toLowerCase() !== primaryKey.toLowerCase()) {
      stats[ev.email.toLowerCase()] = item;
    }
    if (ev.leadId && ev.leadId !== primaryKey) {
      stats[ev.leadId] = item;
    }
  }
  return stats;
}
var getAuth = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
  const spreadsheetId = req.headers["x-spreadsheet-id"] || req.body?.spreadsheetId || req.query?.spreadsheetId;
  return { token, spreadsheetId };
};
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip || "127.0.0.1";
    const cleanEmail = String(email).toLowerCase().trim();
    const lockout = await checkLockout(cleanEmail, clientIp);
    if (lockout.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockout.remainingMinutes || 15} minutes.`
      });
    }
    const authProvider = getAuthProvider();
    const user = await authProvider.authenticate(cleanEmail, String(password));
    if (!user) {
      const attempt = await recordFailedAttempt(cleanEmail, clientIp);
      if (attempt.isLocked) {
        return res.status(429).json({
          success: false,
          error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${attempt.remainingMinutes || 15} minutes.`
        });
      }
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: "Account is deactivated. Please contact an administrator." });
    }
    await clearLockout(cleanEmail, clientIp);
    const db = await getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.collection("users").updateOne({ id: user.id }, { $set: { lastLoginAt: now } });
    const token = createSessionToken({ id: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);
    const permissions = getPermissionsForRole(user.role);
    return res.json({
      success: true,
      user: {
        ...user,
        lastLoginAt: now,
        permissions
      }
    });
  } catch (err) {
    console.error("[Auth API] Login error:", err);
    return res.status(500).json({ success: false, error: "Internal login error" });
  }
});
app.post("/api/auth/logout", async (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
});
app.get("/api/auth/me", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized: Session missing or expired" });
  }
  res.json({ success: true, user: req.user });
});
app.post("/api/auth/change-password", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Current password and new password are required" });
    }
    const result = await changeOwnPassword(req.user.id, oldPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, user: result.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/users", requirePermission("users.manage"), async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/users", requirePermission("users.manage"), async (req, res) => {
  try {
    const user = await createUser(req.body || {});
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/users/:id/toggle-active", requirePermission("users.manage"), async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const result = await toggleUserActive(req.params.id, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/users/:id/change-role", requirePermission("users.changeRoles"), async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { role } = req.body || {};
    const result = await changeUserRole(req.params.id, role, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/users/:id/reset-password", requirePermission("users.manage"), async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    const result = await resetUserPassword(req.params.id, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/users/:id", requirePermission("users.manage"), async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const reassignToUserId = req.body?.reassignToUserId || req.query?.reassignToUserId || "";
    if (!reassignToUserId) {
      return res.status(400).json({ success: false, error: "A replacement user (reassignToUserId) is required to inherit leads and campaigns." });
    }
    const result = await deleteUser(req.params.id, reassignToUserId, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/health", async (_req, res) => {
  const mongo = await getMongoStatus();
  res.json({
    status: "ok",
    database: "mongodb",
    connected: mongo.connected,
    mongo
  });
});
app.get("/api/mongodb/status", requireAdmin, async (_req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});
app.get("/api/mongodb/test-atlas", requireAdmin, async (req, res) => {
  const customUri = req.query.uri || "";
  const variations = customUri ? [{ name: "custom", uri: customUri }] : [
    {
      name: "Original with appName",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?appName=Cluster0"
    },
    {
      name: "With dbName in path (outreach_flow)",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/outreach_flow?retryWrites=true&w=majority&appName=Cluster0"
    },
    {
      name: "With authSource=admin",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&appName=Cluster0"
    },
    {
      name: "With authMechanism=SCRAM-SHA-1",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-1"
    },
    {
      name: "With authMechanism=SCRAM-SHA-256",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-256"
    }
  ];
  const results = [];
  for (const item of variations) {
    const testClient = new MongoClient2(item.uri, {
      serverSelectionTimeoutMS: 3e3,
      connectTimeoutMS: 3e3
    });
    try {
      await testClient.connect();
      const ping = await testClient.db("admin").command({ ping: 1 });
      results.push({
        name: item.name,
        success: true,
        ping
      });
      await testClient.close();
      break;
    } catch (e) {
      results.push({
        name: item.name,
        success: false,
        error: e.message,
        code: e.code,
        codeName: e.codeName
      });
      try {
        await testClient.close();
      } catch {
      }
    }
  }
  res.json({ results });
});
app.post("/api/mongodb/update-uri", requireAdmin, async (req, res) => {
  const { uri } = req.body || {};
  if (!uri || typeof uri !== "string") {
    return res.status(400).json({ success: false, error: 'Valid "uri" string is required.' });
  }
  const result = await updateMongoUri(uri);
  const status = await getMongoStatus();
  if (result.success) {
    res.json({ success: true, database: result.database, status });
  } else {
    res.status(400).json({ success: false, error: result.error, code: result.code, status });
  }
});
app.post("/api/mongodb/migrate", requireAdmin, async (_req, res) => {
  try {
    const db = await getDb();
    const result = await autoSeedFromLocalData(db);
    const status = await getMongoStatus();
    res.json({ success: true, result, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function isInternalAppRequest(req) {
  const referer = (req.headers["referer"] || req.headers["referrer"] || "").toString().toLowerCase();
  const origin = (req.headers["origin"] || "").toString().toLowerCase();
  const source = referer || origin;
  if (!source) return false;
  const host = (req.headers["host"] || "").toString().toLowerCase();
  const xForwardedHost = (req.headers["x-forwarded-host"] || "").toString().toLowerCase();
  if (host && (source.includes(host) || source.startsWith(`http://${host}`) || source.startsWith(`https://${host}`))) {
    return true;
  }
  if (xForwardedHost && source.includes(xForwardedHost)) {
    return true;
  }
  if (process.env.APP_URL) {
    try {
      const appUrlHost = new URL(process.env.APP_URL).host.toLowerCase();
      if (appUrlHost && source.includes(appUrlHost)) {
        return true;
      }
    } catch (_) {
    }
  }
  if (source.includes("localhost") || source.includes("127.0.0.1")) {
    return true;
  }
  return false;
}
var handleOpenTracking = async (req, res) => {
  const leadId = (req.query.leadId || req.params.leadId || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || req.params.stage || "1").toString(), 10) || 1;
  const campaign = (req.query.campaign || "default").toString();
  const isInternal = isInternalAppRequest(req);
  if (!isInternal && (leadId || email)) {
    const newEvent = {
      id: `open-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "open",
      leadId: leadId || email,
      email: email || void 0,
      stage,
      campaign,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || ""
    };
    try {
      await recordTrackingEvent(newEvent);
      runDueCampaignsJob(void 0, void 0, void 0, void 0).catch((err) => {
        console.warn("[Track Open] Background campaign run error:", err);
      });
    } catch (err) {
      console.error("Failed to record open event:", err);
    }
  }
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF_1X1.length.toString(),
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });
  res.end(TRANSPARENT_GIF_1X1);
};
app.get("/api/track/open", handleOpenTracking);
app.get("/api/track/open/:leadId", handleOpenTracking);
app.get("/api/track/open/:leadId/:stage", handleOpenTracking);
app.get("/api/track/click", async (req, res) => {
  const targetUrl = (req.query.url || "https://example.com").toString();
  const leadId = (req.query.leadId || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || "1").toString(), 10) || 1;
  const campaign = (req.query.campaign || "default").toString();
  const isInternal = isInternalAppRequest(req);
  if (!isInternal && (leadId || email)) {
    const newEvent = {
      id: `click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "click",
      leadId: leadId || email,
      email: email || void 0,
      stage,
      campaign,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      targetUrl,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || ""
    };
    try {
      await recordTrackingEvent(newEvent);
      runDueCampaignsJob(void 0, void 0, void 0, void 0).catch((err) => {
        console.warn("[Track Click] Background campaign run error:", err);
      });
    } catch (err) {
      console.error("Failed to record click event:", err);
    }
  }
  res.redirect(302, targetUrl);
});
app.post("/api/track/reset-lead", async (req, res) => {
  try {
    const { leadId, email } = req.body;
    if (!leadId && !email) {
      return res.status(400).json({ success: false, error: "leadId or email is required" });
    }
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanLeadId = (leadId || "").toString().trim();
    const db = await getDb();
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const filter = [];
    if (cleanLeadId) {
      filter.push({ leadId: cleanLeadId });
    }
    if (cleanEmail) {
      const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      filter.push({ email: emailRegex });
      filter.push({ leadId: emailRegex });
    }
    if (req.user && req.user.role !== "admin") {
      const existingLead = await leadsCol.findOne({ $or: filter });
      if (!existingLead || existingLead.ownerId && existingLead.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, error: "Lead not found" });
      }
    }
    const deletedEvents = await eventsCol.deleteMany({ $or: filter });
    const updatedLeads = await leadsCol.updateMany(
      { $or: filter },
      {
        $set: {
          opensCount: 0,
          clicksCount: 0,
          firstOpenedDate: "",
          lastOpenedDate: "",
          firstClickedDate: "",
          lastClickedDate: "",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    res.json({
      success: true,
      message: "Tracking reset successfully for lead",
      deletedEvents: deletedEvents.deletedCount,
      updatedLeads: updatedLeads.modifiedCount
    });
  } catch (err) {
    console.error("API /api/track/reset-lead error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/track/debug", requireAdmin, async (req, res) => {
  try {
    const leadId = (req.query.leadId || "").toString().trim();
    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }
    const allEvents = await loadTrackingEvents();
    const leadEvents = allEvents.filter(
      (e) => e.leadId === leadId || e.email && e.email.toLowerCase() === leadId.toLowerCase()
    );
    leadEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest20 = leadEvents.slice(0, 20).map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      userAgent: e.userAgent || ""
    }));
    res.json({
      success: true,
      leadId,
      totalEvents: leadEvents.length,
      events: latest20
    });
  } catch (err) {
    console.error("API /api/track/debug error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/track/events", async (req, res) => {
  try {
    const ownerId = req.user && req.user.role !== "admin" ? req.user.id : void 0;
    const events = await loadTrackingEvents(ownerId);
    const statsByLead = computeStatsByLead(events);
    res.json({
      success: true,
      totalOpens: events.filter((e) => e.type === "open").length,
      totalClicks: events.filter((e) => e.type === "click").length,
      events,
      statsByLead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/track/event", requireAdmin, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, error: "Manual tracking event generation is disabled in production" });
    }
    const { type, leadId, stage, campaign, targetUrl } = req.body;
    if (!type || !leadId) {
      return res.status(400).json({ error: "Missing type or leadId" });
    }
    const newEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: type === "click" ? "click" : "open",
      leadId,
      stage: stage || 1,
      campaign: campaign || "default",
      targetUrl,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userAgent: req.headers["user-agent"] || "manual"
    };
    const saved = await recordTrackingEvent(newEvent);
    res.json({ success: true, event: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/track/clear", requireAdmin, async (_req, res) => {
  try {
    await clearAllTrackingEvents();
    res.json({ success: true, message: "All tracking events cleared" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all(["/api/leads", "/api/leads/list", "/api/leads/local"], async (req, res) => {
  try {
    const filter = req.user && req.user.role !== "admin" ? { ownerId: req.user.id } : {};
    const leads = await listLeads(void 0, void 0, filter);
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    console.error("API /api/leads/list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/create", async (req, res) => {
  try {
    const leadData = req.body.lead || (req.body.email || req.body.name || req.body.leadId ? req.body : null);
    if (!leadData) {
      return res.status(400).json({ success: false, error: "Missing lead object in request body" });
    }
    const created = await createLead(leadData, req.user);
    res.json({ success: true, lead: created });
  } catch (err) {
    console.error("API /api/leads/create error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/update", async (req, res) => {
  try {
    const leadData = req.body.lead || (req.body.leadId ? req.body : null);
    if (!leadData || !leadData.leadId) {
      return res.status(400).json({ success: false, error: "Missing lead object or leadId" });
    }
    const updated = await updateLead(leadData, void 0, void 0, req.user);
    res.json({ success: true, lead: updated });
  } catch (err) {
    console.error("API /api/leads/update error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/mark-reply-read", async (req, res) => {
  try {
    const { leadId, email } = req.body;
    const db = await getDb();
    const filters = [];
    if (leadId) filters.push({ leadId: leadId.trim() });
    if (email) filters.push({ email: { $regex: `^${email.trim()}$`, $options: "i" } });
    if (filters.length === 0) {
      return res.status(400).json({ success: false, error: "leadId or email is required" });
    }
    const leadDoc = await db.collection(COLLECTIONS.LEADS).findOne({ $or: filters });
    if (!leadDoc) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (req.user && req.user.role !== "admin" && leadDoc.ownerId && leadDoc.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    await db.collection(COLLECTIONS.LEADS).updateMany(
      { $or: filters },
      { $set: { hasUnreadReply: false, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
    );
    res.json({ success: true, message: "Marked reply as read" });
  } catch (err) {
    console.error("API /api/leads/mark-reply-read error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/batch", async (req, res) => {
  try {
    const leadsData = req.body.leads;
    if (!Array.isArray(leadsData)) {
      return res.status(400).json({ success: false, error: "Expected leads array" });
    }
    const created = await batchCreateLeads(leadsData, req.user);
    res.json({ success: true, count: created.length, leads: created });
  } catch (err) {
    console.error("API /api/leads/batch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/delete", async (req, res) => {
  try {
    const { leadId, email } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: "Missing leadId" });
    }
    const cleanId = String(leadId).trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    for (let i = inMemoryInboundReplies.length - 1; i >= 0; i--) {
      const r = inMemoryInboundReplies[i];
      if (cleanId && r.leadId === cleanId || cleanEmail && r.leadEmail.toLowerCase() === cleanEmail) {
        inMemoryInboundReplies.splice(i, 1);
      }
    }
    const deleted = await deleteLead(leadId, req.user);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("API /api/leads/delete error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/:leadId/reassign", requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: "targetUserId is required" });
    }
    const requestingUser = { id: req.user.id, name: req.user.name, role: req.user.role };
    const result = await reassignLead(req.params.leadId, targetUserId, requestingUser);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/reassign-all", requireAdmin, async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body || {};
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ success: false, error: "fromUserId and toUserId are required" });
    }
    const requestingUser = { id: req.user.id, name: req.user.name, role: req.user.role };
    const result = await reassignAllLeads(fromUserId, toUserId, requestingUser);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.get(["/api/campaigns", "/api/campaigns/list"], async (_req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    console.error("API /api/campaigns error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/campaigns", "/api/campaigns/save"], async (req, res) => {
  try {
    const campaign = req.body.campaign || req.body;
    if (!campaign || !campaign.id) {
      return res.status(400).json({ success: false, error: "Missing campaign or campaign.id" });
    }
    const saved = await saveCampaign(campaign, req.user);
    res.json({ success: true, campaign: saved });
  } catch (err) {
    console.error("API /api/campaigns/save error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/delete", async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Missing campaignId" });
    }
    const deleted = await deleteCampaign(campaignId, req.user);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("API /api/campaigns/delete error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/toggle-active", async (req, res) => {
  try {
    const { campaignId, isActive } = req.body;
    if (!campaignId || isActive === void 0) {
      return res.status(400).json({ success: false, error: "Missing campaignId or isActive" });
    }
    const updated = await toggleCampaignActive(campaignId, Boolean(isActive), req.user);
    res.json({ success: true, campaign: updated });
  } catch (err) {
    console.error("API /api/campaigns/toggle-active error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.get("/api/campaigns/:id/impact", async (req, res) => {
  try {
    const result = await checkCampaignImpact(req.params.id, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/:id/duplicate", async (req, res) => {
  try {
    const { name } = req.body || {};
    const duplicated = await duplicateCampaign(req.params.id, req.user, name);
    res.json({ success: true, campaign: duplicated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post(["/api/campaigns/:id/restore", "/api/campaigns/:id/restore-version"], async (req, res) => {
  try {
    const { version } = req.body || {};
    if (typeof version !== "number") {
      return res.status(400).json({ success: false, error: "Target version number is required" });
    }
    const restored = await restoreCampaignVersion(req.params.id, version, req.user);
    res.json({ success: true, campaign: restored });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/import/parse", async (req, res) => {
  try {
    const { filename, fileBase64, existingEmails, columnMapping } = req.body;
    if (!filename || !fileBase64) {
      return res.status(400).json({ success: false, error: "Missing filename or fileBase64" });
    }
    const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanedBase64, "base64");
    const result = parseFileBuffer(buffer, filename, existingEmails || [], columnMapping);
    res.json(result);
  } catch (err) {
    console.error("API /api/import/parse error:", err);
    res.status(400).json({ success: false, error: err.message || "Failed to parse file" });
  }
});
app.post("/api/campaigns/run-due", requireAdmin, async (req, res) => {
  try {
    const { token, spreadsheetId } = getAuth(req);
    const { campaignId, userEmail } = req.body;
    const result = await runDueCampaignsJob(campaignId, token, spreadsheetId, userEmail);
    res.json(result);
  } catch (err) {
    console.error("API /api/campaigns/run-due error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/settings", requireAdmin, async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/settings", requireAdmin, async (req, res) => {
  try {
    const updated = await saveLocalSettings(req.body.settings || req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/senders", requireAdmin, async (_req, res) => {
  try {
    const senders = await loadLocalSenders();
    res.json({ success: true, senders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/senders", requireAdmin, async (req, res) => {
  try {
    const senders = await saveLocalSenders(req.body.senders || []);
    res.json({ success: true, senders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/tasks", async (req, res) => {
  try {
    const ownerId = req.user && req.user.role !== "admin" ? req.user.id : void 0;
    const tasks = await loadLocalTasks(ownerId);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks", async (req, res) => {
  try {
    const tasksList = req.body.tasks || [];
    if (req.user && req.user.role !== "admin") {
      const db = await getDb();
      for (const t of tasksList) {
        if (t.leadId) {
          const l = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: t.leadId });
          if (!l || l.ownerId && l.ownerId !== req.user.id) {
            return res.status(404).json({ success: false, error: "Lead not found" });
          }
        }
      }
    }
    const tasks = await saveLocalTasks(tasksList);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/update", async (req, res) => {
  try {
    const { taskId, updates } = req.body;
    if (!taskId) return res.status(400).json({ success: false, error: "Missing taskId" });
    const db = await getDb();
    const existingTask = await db.collection(COLLECTIONS.TASKS).findOne({ id: taskId });
    if (!existingTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    if (req.user && req.user.role !== "admin" && existingTask.leadId) {
      const lead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: existingTask.leadId });
      if (!lead || lead.ownerId && lead.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }
    }
    const task = await updateLocalTask(taskId, updates);
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/delete", async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: "Missing taskId" });
    }
    const db = await getDb();
    const existingTask = await db.collection(COLLECTIONS.TASKS).findOne({ id: taskId });
    if (!existingTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    if (req.user && req.user.role !== "admin" && existingTask.leadId) {
      const lead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: existingTask.leadId });
      if (!lead || lead.ownerId && lead.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }
    }
    const deleted = await deleteLocalTask(taskId);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/user-state/notes", async (req, res) => {
  try {
    const notes = await loadUserWorkspaceNotes(req.user.id);
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var handleSaveNotes = async (req, res) => {
  try {
    const notes = String(req.body.notes || "");
    await saveUserWorkspaceNotes(req.user.id, notes);
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post("/api/user-state/notes", handleSaveNotes);
app.put("/api/user-state/notes", handleSaveNotes);
app.get("/api/user-state/alerts", async (req, res) => {
  try {
    const state2 = await loadUserAlertsState(req.user.id);
    res.json({ success: true, dismissedAlertIds: state2.dismissedAlertIds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/user-state/alerts", async (req, res) => {
  try {
    const alertIds = Array.isArray(req.body.alertIds) ? req.body.alertIds : Array.isArray(req.body.dismissedIds) ? req.body.dismissedIds : Array.isArray(req.body.dismissedAlertIds) ? req.body.dismissedAlertIds : req.body.alertId ? [req.body.alertId] : [];
    const dismissedAlertIds = await saveUserDismissedAlerts(req.user.id, alertIds);
    res.json({ success: true, dismissedAlertIds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/user-state/alerts", async (req, res) => {
  try {
    await clearUserAlertsState(req.user.id);
    res.json({ success: true, dismissedAlertIds: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/tasks/alerts-state", async (req, res) => {
  try {
    const state2 = await loadUserAlertsState(req.user.id);
    res.json({ success: true, dismissedAlertIds: state2.dismissedAlertIds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/alerts-state/dismiss", async (req, res) => {
  try {
    const alertIds = Array.isArray(req.body.alertIds) ? req.body.alertIds : req.body.alertId ? [req.body.alertId] : [];
    const updated = await saveUserDismissedAlerts(req.user.id, alertIds);
    res.json({ success: true, dismissedAlertIds: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/alerts-state/clear", async (req, res) => {
  try {
    await clearUserAlertsState(req.user.id);
    res.json({ success: true, dismissedAlertIds: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/system/stats", async (req, res) => {
  try {
    const ownerId = req.user && req.user.role !== "admin" ? req.user.id : void 0;
    const stats = await getSystemStatsSummary(ownerId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/emails/send", async (req, res) => {
  try {
    const { to, subject, htmlBody, leadId, stage, campaign, senderEmail } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, error: 'Recipient "to" and "subject" are required' });
    }
    if (leadId) {
      const db = await getDb();
      const lead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: leadId.trim() });
      if (!lead) {
        return res.status(404).json({ success: false, error: "Lead not found" });
      }
      if (req.user && req.user.role !== "admin" && lead.ownerId && lead.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, error: "Lead not found" });
      }
    }
    const baseUrl = getPublicBaseUrl(req);
    const trackingPixelHtml = `<img src="${baseUrl}/api/track/open?leadId=${encodeURIComponent(leadId || "")}&stage=${encodeURIComponent(stage || 1)}&campaign=${encodeURIComponent(campaign || "default")}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;
    res.json({
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      to,
      subject,
      leadId,
      stage: stage || 1,
      senderEmail,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      trackingPixelUrl: `${baseUrl}/api/track/open?leadId=${leadId}&stage=${stage}`
    });
  } catch (err) {
    console.error("API /api/emails/send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/email/service-account", requireAdmin, async (_req, res) => {
  try {
    const profile = getServiceAccountProfile();
    const diagnostics = await getAuthDiagnostics();
    res.json({ success: true, profile, diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/send-stage", async (req, res) => {
  try {
    const { lead, template, stageNum, customSenderName } = req.body;
    if (!lead || !lead.email) {
      return res.status(400).json({ success: false, error: "Lead with email is required" });
    }
    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: "Database unavailable" });
    const dbLead = await db.collection(COLLECTIONS.LEADS).findOne({
      $or: [
        ...lead.leadId ? [{ leadId: lead.leadId }] : [],
        ...lead.email ? [{ email: lead.email.trim().toLowerCase() }] : []
      ]
    });
    if (!dbLead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (req.user && req.user.role !== "admin" && dbLead.ownerId && dbLead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (dbLead.status === "Negative Reply" || lead.status === "Negative Reply") {
      return res.status(400).json({
        success: false,
        error: `Cannot email lead ${lead.name || lead.email}: Lead status is "Negative Reply" (do not contact).`
      });
    }
    const effectiveStage = stageNum || (dbLead.currentStage != null ? dbLead.currentStage + 1 : 1);
    const nodeOrStage = template?.useCustomTemplate && template?.customSubject ? { data: template } : effectiveStage;
    const resolved = await resolveEmailContent(dbLead, nodeOrStage);
    const effectiveTemplate = {
      stage: resolved.stage || effectiveStage,
      name: `Stage ${resolved.stage || effectiveStage}`,
      purpose: "Outreach",
      defaultGapDays: 3,
      subject: resolved.subject,
      bodyHtml: resolved.bodyHtml
    };
    const baseUrl = getPublicBaseUrl(req);
    const result = await sendAppEmail({
      lead: dbLead,
      template: effectiveTemplate,
      stageNum: effectiveStage,
      senderDisplayName: customSenderName,
      baseUrl
    });
    await db.collection(COLLECTIONS.LEADS).updateOne(
      { leadId: dbLead.leadId },
      { $set: { sentBy: req.user?.name || "System", lastModifiedBy: req.user?.name || "System", updatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
    );
    const effectiveSender = customSenderName ? `"${customSenderName}" <${lead.senderUsed || "care@giniiris.ai"}>` : lead.senderUsed ? `Outreach Flow <${lead.senderUsed}>` : "You <care@giniiris.ai>";
    await recordSentEmail({
      id: result.messageId,
      leadId: lead.leadId,
      leadEmail: lead.email,
      threadId: result.threadId || lead.threadId,
      from: effectiveSender,
      to: lead.email,
      subject: result.subject || effectiveTemplate.subject,
      bodyHtml: result.bodyHtml || effectiveTemplate.bodyHtml,
      stage: effectiveStage,
      campaign: lead.campaign
    });
    res.json(result);
  } catch (err) {
    console.error("API /api/email/send-stage error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/template-sets/default", requireAuth, async (_req, res) => {
  try {
    const defaultSet = await getDefaultTemplateSet();
    res.json({ success: true, templateSet: defaultSet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/template-sets/user/:userId", requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const isSelf = req.user?.id === targetUserId;
    const isAdmin = req.user?.role === "admin";
    const hasViewAny = req.user?.permissions?.includes("templates.editAny");
    if (!isSelf && !isAdmin && !hasViewAny) {
      return res.status(403).json({ success: false, error: "Forbidden: You do not have permission to view other users' templates" });
    }
    const userSet = await getUserTemplateSet(targetUserId);
    res.json({ success: true, templateSet: userSet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/template-sets/campaign/:campaignId", requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const campSet = await getCampaignTemplateSet(campaignId);
    res.json({ success: true, templateSet: campSet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/template-sets/save", requireAuth, async (req, res) => {
  try {
    const { setId, stages } = req.body;
    if (!setId || !Array.isArray(stages)) {
      return res.status(400).json({ success: false, error: "Missing setId or stages array" });
    }
    const updated = await saveTemplateSet(setId, stages, req.user);
    res.json({ success: true, templateSet: updated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/template-sets/:id/restore", requireAuth, async (req, res) => {
  try {
    const setId = req.params.id;
    const { version } = req.body;
    if (version === void 0 || version === null) {
      return res.status(400).json({ success: false, error: "Missing version parameter" });
    }
    const restored = await restoreTemplateSetVersion(setId, Number(version), req.user);
    res.json({ success: true, templateSet: restored });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.post("/api/template-sets/user/:userId/reset", requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const isSelf = req.user?.id === targetUserId;
    const isAdmin = req.user?.role === "admin";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, error: "Forbidden: You can only reset your own template set" });
    }
    const resetSet = await resetUserTemplateSetToDefault(targetUserId, req.user);
    res.json({ success: true, templateSet: resetSet });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
app.get("/api/template-sets/campaign/:campaignId/impact", requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const impact = await getCampaignTemplateImpact(campaignId);
    res.json({ success: true, impact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/templates/resolve-preview", requireAuth, async (req, res) => {
  try {
    const { lead, stage, node, campaignId } = req.body;
    const effectiveLead = lead || { leadId: "preview-lead", name: "Alex Johnson", email: "alex@example.com", company: "Acme Corp", campaignId };
    if (campaignId && !effectiveLead.campaignId) effectiveLead.campaignId = campaignId;
    const resolved = await resolveEmailContent(effectiveLead, node || stage || 1);
    const settings = await loadLocalSettings();
    const baseUrl = getPublicBaseUrl(req);
    const composed = composeFullEmail({
      bodyHtml: resolved.bodyHtml,
      headerHtml: settings.emailHeader || "",
      footerHtml: settings.emailFooter || "",
      lead: effectiveLead,
      stage: resolved.stage,
      senderDisplayName: req.user?.name || "Outreach Flow",
      baseUrl,
      embedTrackingPixel: true
    });
    res.json({
      success: true,
      resolved,
      composed
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/settings/header-footer", requireAuth, async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({
      success: true,
      header: settings.emailHeader || "",
      footer: settings.emailFooter || ""
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/settings/header-footer", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const hasHeaderFooterPerm = Boolean(req.user?.permissions?.includes("templates.editHeaderFooter"));
    if (!isAdmin && !hasHeaderFooterPerm) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only administrators can modify global email header and footer"
      });
    }
    const { header, footer } = req.body;
    const sanitizedHeader = sanitizeHtml(String(header || ""));
    const sanitizedFooter = sanitizeHtml(String(footer || ""));
    const currentSettings = await loadLocalSettings();
    const updatedSettings = {
      ...currentSettings,
      emailHeader: sanitizedHeader,
      emailFooter: sanitizedFooter
    };
    await saveLocalSettings(updatedSettings);
    res.json({
      success: true,
      header: sanitizedHeader,
      footer: sanitizedFooter
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function stripHtmlTags(html) {
  return (html || "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
async function recordSentEmail(entry) {
  const db = await getDb().catch(() => null);
  const cleanEmail = (entry.leadEmail || entry.to || "").trim().toLowerCase();
  const doc = {
    id: entry.id || `sent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    leadId: entry.leadId || "",
    leadEmail: cleanEmail,
    threadId: entry.threadId || "",
    from: entry.from || "You <care@giniiris.ai>",
    to: entry.to || cleanEmail,
    subject: entry.subject || "Outreach email",
    bodyHtml: entry.bodyHtml || "",
    bodyText: entry.bodyText || stripHtmlTags(entry.bodyHtml),
    snippet: stripHtmlTags(entry.bodyHtml).substring(0, 160),
    date: entry.date || (/* @__PURE__ */ new Date()).toISOString(),
    stage: entry.stage || 1,
    campaign: entry.campaign || "",
    isFromLead: false
  };
  if (db) {
    try {
      await db.collection("sent_emails").updateOne(
        { id: doc.id },
        { $set: doc },
        { upsert: true }
      );
    } catch (e) {
      console.warn("Could not persist sent_email doc to DB:", e);
    }
  }
  return doc;
}
var inMemoryInboundReplies = [];
app.get("/api/email/thread", async (req, res) => {
  try {
    const threadId = req.query.threadId || "";
    const leadEmail = req.query.leadEmail || "";
    const leadId = req.query.leadId || "";
    const cleanEmail = leadEmail.trim().toLowerCase();
    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: "Database unavailable" });
    const leadQuery = {};
    if (leadId) {
      leadQuery.leadId = leadId.trim();
    } else if (cleanEmail && threadId) {
      leadQuery.$or = [{ email: cleanEmail }, { threadId }];
    } else if (cleanEmail) {
      leadQuery.email = cleanEmail;
    } else if (threadId) {
      leadQuery.threadId = threadId;
    }
    const leadDoc = Object.keys(leadQuery).length > 0 ? await db.collection(COLLECTIONS.LEADS).findOne(leadQuery) : null;
    if (!leadDoc) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (req.user && req.user.role !== "admin" && leadDoc.ownerId && leadDoc.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const graphResult = await getAppConversationThread(threadId || leadDoc.threadId, cleanEmail || leadDoc.email).catch(() => ({ messages: [], subject: "" }));
    let sentMessages = [];
    try {
      const sentQuery = {};
      const targetEmail = cleanEmail || leadDoc.email;
      const targetThreadId = threadId || leadDoc.threadId;
      if (targetEmail && targetThreadId) {
        sentQuery.$or = [{ leadEmail: targetEmail }, { threadId: targetThreadId }];
      } else if (targetEmail) {
        sentQuery.leadEmail = targetEmail;
      } else if (targetThreadId) {
        sentQuery.threadId = targetThreadId;
      }
      sentMessages = await db.collection("sent_emails").find(sentQuery).toArray();
    } catch (_) {
    }
    if (sentMessages.length === 0 && leadDoc && (leadDoc.lastEmailSentDate || (leadDoc.currentStage || 0) >= 1)) {
      try {
        let campaignDoc = null;
        if (leadDoc.campaignId) {
          campaignDoc = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ id: leadDoc.campaignId }).catch(() => null);
        } else if (leadDoc.campaign) {
          campaignDoc = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ name: leadDoc.campaign }).catch(() => null);
        }
        const senderDisplayName = leadDoc.senderUsed || "Care";
        const senderEmail = leadDoc.senderUsed || "care@giniiris.ai";
        const maxStage = Math.max(1, leadDoc.currentStage || 1);
        for (let st = 1; st <= maxStage; st++) {
          let subject2 = "";
          let bodyHtml = "";
          if (campaignDoc) {
            const nodes = campaignDoc.workflow_graph?.nodes || campaignDoc.nodes || [];
            const emailNodes = nodes.filter((n) => n.type === "emailNode" || n.data?.nodeType === "email");
            const emailNode = emailNodes[st - 1];
            if (emailNode?.data) {
              subject2 = emailNode.data.customSubject || "";
              bodyHtml = (emailNode.data.customBody || "").replace(/\n/g, "<br/>");
            }
          }
          if (!subject2 || !bodyHtml) {
            const defaultTpl = DEFAULT_STAGE_TEMPLATES.find((t) => t.stage === st) || DEFAULT_STAGE_TEMPLATES[0];
            subject2 = subject2 || defaultTpl.subject;
            bodyHtml = bodyHtml || defaultTpl.bodyHtml;
          }
          const renderedSubject = renderEmailMergeTags(subject2, leadDoc, senderDisplayName);
          const renderedBody = renderEmailMergeTags(bodyHtml, leadDoc, senderDisplayName);
          const backfilledDoc = {
            id: `sent-${leadDoc.leadId}-stage-${st}`,
            leadId: leadDoc.leadId,
            leadEmail: cleanEmail || leadDoc.email.toLowerCase(),
            threadId: threadId || leadDoc.threadId || "",
            from: `"${senderDisplayName}" <${senderEmail}>`,
            to: leadDoc.email,
            date: leadDoc.lastEmailSentDate || leadDoc.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            subject: renderedSubject,
            snippet: stripHtmlTags(renderedBody).substring(0, 160),
            bodyHtml: renderedBody,
            bodyText: stripHtmlTags(renderedBody),
            stage: st,
            campaign: leadDoc.campaign || "",
            isFromLead: false
          };
          sentMessages.push(backfilledDoc);
          if (db) {
            await db.collection("sent_emails").updateOne(
              { id: backfilledDoc.id },
              { $set: backfilledDoc },
              { upsert: true }
            ).catch(() => {
            });
          }
        }
      } catch (backfillErr) {
        console.warn("Error backfilling sent stage emails:", backfillErr);
      }
    }
    let inboundReplies = [];
    if (db) {
      try {
        const inbQuery = {};
        if (cleanEmail && threadId) {
          inbQuery.$or = [{ leadEmail: cleanEmail }, { threadId }];
        } else if (cleanEmail) {
          inbQuery.leadEmail = cleanEmail;
        } else if (threadId) {
          inbQuery.threadId = threadId;
        }
        inboundReplies = await db.collection("inbound_replies").find(inbQuery).toArray();
      } catch (_) {
      }
    }
    for (const inb of inMemoryInboundReplies) {
      if (cleanEmail && inb.leadEmail === cleanEmail || threadId && inb.threadId === threadId) {
        if (!inboundReplies.some((m) => m.id === inb.id)) {
          inboundReplies.push(inb);
        }
      }
    }
    const messageMap = /* @__PURE__ */ new Map();
    for (const msg of graphResult.messages || []) {
      messageMap.set(msg.id, msg);
    }
    for (const sent of sentMessages) {
      messageMap.set(sent.id, {
        id: sent.id,
        threadId: sent.threadId || threadId,
        from: sent.from || "You <care@giniiris.ai>",
        to: sent.to || cleanEmail,
        date: sent.date,
        subject: sent.subject,
        snippet: sent.snippet || stripHtmlTags(sent.bodyHtml),
        bodyHtml: sent.bodyHtml,
        bodyText: sent.bodyText || stripHtmlTags(sent.bodyHtml),
        isFromLead: false
      });
    }
    for (const inb of inboundReplies) {
      if (!inb) continue;
      const rawBody = inb.body || inb.bodyText || inb.snippet || "";
      if (rawBody.includes("Incoming reply flag detected on lead record") || rawBody.includes("Status already marked Replied") || rawBody.includes("Status marked Negative Reply")) {
        continue;
      }
      messageMap.set(inb.id, {
        id: inb.id,
        threadId: inb.threadId || threadId,
        from: inb.from || cleanEmail,
        to: inb.to || "",
        date: inb.receivedDateTime || inb.date || (/* @__PURE__ */ new Date()).toISOString(),
        subject: inb.subject || "Re: Outreach Flow follow-up",
        snippet: inb.snippet || rawBody,
        bodyHtml: inb.bodyHtml || (rawBody ? `<p>${rawBody.replace(/\n/g, "<br/>")}</p>` : ""),
        bodyText: rawBody,
        isFromLead: true
      });
    }
    const allRaw = Array.from(messageMap.values());
    const seenSignatures = /* @__PURE__ */ new Set();
    const deduplicatedMessages = [];
    for (const msg of allRaw) {
      const isFromLead = Boolean(msg.isFromLead);
      const cleanBody = (msg.bodyText || msg.snippet || msg.bodyHtml || "").trim().replace(/\s+/g, " ").toLowerCase().substring(0, 100);
      const dateDay = (msg.date || "").slice(0, 10);
      const signature = isFromLead ? `inbound_${(msg.from || cleanEmail).toLowerCase().trim()}_${cleanBody}` : `outbound_${msg.stage || 0}_${dateDay}_${(msg.subject || "").trim().toLowerCase()}`;
      if (cleanBody && seenSignatures.has(signature)) {
        continue;
      }
      seenSignatures.add(signature);
      deduplicatedMessages.push(msg);
    }
    deduplicatedMessages.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    const subject = graphResult.subject || sentMessages[0]?.subject || inboundReplies[0]?.subject || (threadId ? `Conversation ${threadId}` : "Email Thread");
    res.json({
      success: true,
      messages: deduplicatedMessages,
      subject
    });
  } catch (err) {
    console.error("API /api/email/thread error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/check-reply", async (req, res) => {
  try {
    const { leadEmail, threadId, lastSentDate, leadId } = req.body;
    if (!leadEmail && !threadId && !leadId) {
      return res.status(400).json({ success: false, error: "leadEmail, threadId, or leadId is required" });
    }
    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: "Database unavailable" });
    const filter = {};
    if (leadId) filter.leadId = leadId.trim();
    else if (leadEmail) filter.email = leadEmail.trim().toLowerCase();
    else if (threadId) filter.threadId = threadId.trim();
    const dbLead = await db.collection(COLLECTIONS.LEADS).findOne(filter);
    if (!dbLead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (req.user && req.user.role !== "admin" && dbLead.ownerId && dbLead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const result = await checkAppThreadForReply({
      leadEmail: leadEmail || dbLead.email,
      threadId: threadId || dbLead.threadId,
      lastSentDate: lastSentDate || dbLead.lastEmailSentDate
    });
    if (result.hasReplied) {
      const applyResult = await applyLeadReply({
        leadEmail: leadEmail || dbLead.email,
        threadId: threadId || dbLead.threadId,
        messageId: result.replyMessage?.id,
        subject: result.replyMessage?.subject || "Re: Outreach Flow follow-up",
        body: result.replyMessage?.bodyPreview || result.reason || "",
        from: result.replyMessage?.from || leadEmail || dbLead.email,
        receivedDateTime: result.replyMessage?.receivedDateTime,
        source: "Microsoft Graph Reply Check"
      });
      return res.json({
        success: true,
        ...result,
        applied: applyResult.applied,
        updatedLead: applyResult.lead,
        classification: applyResult.classification,
        pausedCompanyLeadsCount: applyResult.pausedCompanyLeadsCount,
        pendingConfirmation: applyResult.pendingConfirmation
      });
    }
    if (process.env.NODE_ENV !== "production") {
      const effectiveLastSent = lastSentDate || dbLead.lastEmailSentDate;
      const effectiveThreadId = threadId || dbLead.threadId;
      if (!effectiveLastSent && !effectiveThreadId) {
        return res.json({ success: true, hasReplied: false, reason: "No outreach email sent to this lead yet" });
      }
      const cleanEmail = (leadEmail || dbLead.email).trim().toLowerCase();
      let reply = inMemoryInboundReplies.find(
        (r) => r.leadEmail === cleanEmail || effectiveThreadId && r.threadId === effectiveThreadId
      );
      if (!reply) {
        try {
          const query = { $or: [{ leadEmail: cleanEmail }] };
          if (effectiveThreadId) query.$or.push({ threadId: effectiveThreadId });
          const dbReply = await db.collection("inbound_replies").findOne(query);
          if (dbReply) reply = dbReply;
        } catch (_) {
        }
      }
      if (reply) {
        if (effectiveLastSent) {
          const sentTime = new Date(effectiveLastSent.includes("T") ? effectiveLastSent : `${effectiveLastSent}T00:00:00Z`).getTime();
          const replyTime = new Date(reply.receivedDateTime || reply.createdAt || 0).getTime();
          if (!isNaN(sentTime) && !isNaN(replyTime) && replyTime <= sentTime) {
            return res.json({ success: true, hasReplied: false, reason: "Stored reply is older than outreach dispatch date" });
          }
        }
        const applyResult = await applyLeadReply({
          leadEmail: cleanEmail,
          threadId: reply.threadId || effectiveThreadId,
          messageId: reply.id,
          subject: reply.subject || "Re: Outreach Flow follow-up",
          body: reply.body || "",
          from: reply.from || cleanEmail,
          receivedDateTime: reply.receivedDateTime,
          source: "Simulated Inbound Reply"
        });
        return res.json({
          success: true,
          hasReplied: true,
          reason: `Inbound reply detected from ${cleanEmail}`,
          replyMessage: {
            id: reply.id,
            from: reply.from || cleanEmail,
            subject: reply.subject,
            receivedDateTime: reply.receivedDateTime,
            bodyPreview: reply.body
          },
          applied: applyResult.applied,
          updatedLead: applyResult.lead,
          classification: applyResult.classification,
          pausedCompanyLeadsCount: applyResult.pausedCompanyLeadsCount,
          pendingConfirmation: applyResult.pendingConfirmation
        });
      }
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("API /api/email/check-reply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/override-sentiment", async (req, res) => {
  try {
    const { leadId, sentiment, reason } = req.body;
    if (!leadId || !sentiment) {
      return res.status(400).json({ success: false, error: "leadId and sentiment are required" });
    }
    const db = await getDb();
    const lead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: leadId.trim() });
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (req.user && req.user.role !== "admin" && lead.ownerId && lead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const result = await manualOverrideSentiment(leadId, sentiment, reason);
    res.json(result);
  } catch (err) {
    console.error("API /api/leads/override-sentiment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/resume-company", async (req, res) => {
  try {
    const replyingLeadId = (req.body.replyingLeadId || req.body.leadId || "").trim();
    if (!replyingLeadId) {
      return res.status(400).json({ success: false, error: "replyingLeadId is required" });
    }
    const db = await getDb();
    const replyingLead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: replyingLeadId });
    if (!replyingLead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const isOwner = replyingLead.ownerId === req.user?.id;
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const result = await resumeCompanyLeads(replyingLeadId);
    if (!isAdmin) {
      return res.json({ success: true, count: result.resumedCount });
    }
    res.json(result);
  } catch (err) {
    console.error("API /api/leads/resume-company error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/confirm-company-pause", async (req, res) => {
  try {
    const replyingLeadId = (req.body.replyingLeadId || req.body.leadId || "").trim();
    if (!replyingLeadId) {
      return res.status(400).json({ success: false, error: "replyingLeadId is required" });
    }
    const db = await getDb();
    const replyingLead = await db.collection(COLLECTIONS.LEADS).findOne({ leadId: replyingLeadId });
    if (!replyingLead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const isOwner = replyingLead.ownerId === req.user?.id;
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    const result = await confirmCompanyPause(replyingLeadId);
    if (!isAdmin) {
      return res.json({ success: true, count: result.pausedCount });
    }
    res.json(result);
  } catch (err) {
    console.error("API /api/leads/confirm-company-pause error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/reply-rules", requireAdmin, async (_req, res) => {
  try {
    const lists = await getActiveKeywords();
    res.json({
      success: true,
      lists,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/reply-rules", requireAdmin, async (req, res) => {
  try {
    const { negativePhrases, positivePhrases, deferralPhrases, autoReplyPhrases } = req.body;
    const sanitizeList = (raw, categoryName) => {
      if (raw === void 0) return void 0;
      if (!Array.isArray(raw)) throw new Error(`${categoryName} must be an array of strings`);
      const sanitized = [];
      const seen = /* @__PURE__ */ new Set();
      for (const item of raw) {
        const str = String(item || "");
        const v = validatePhrase(str, sanitized);
        if (!v.valid) {
          throw new Error(`[${categoryName}] ${v.error}`);
        }
        if (!seen.has(v.normalized)) {
          seen.add(v.normalized);
          sanitized.push(v.normalized);
        }
      }
      return sanitized;
    };
    const updated = await saveActiveKeywords({
      negativePhrases: sanitizeList(negativePhrases, "Negative phrases"),
      positivePhrases: sanitizeList(positivePhrases, "Positive phrases"),
      deferralPhrases: sanitizeList(deferralPhrases, "Deferral phrases"),
      autoReplyPhrases: sanitizeList(autoReplyPhrases, "Auto-reply phrases")
    });
    res.json({
      success: true,
      lists: updated,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/reply-rules/reset", requireAdmin, async (req, res) => {
  try {
    const { category } = req.body;
    const updated = await resetKeywordsToDefault(category);
    res.json({
      success: true,
      lists: updated,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/reply-rules/test", requireAdmin, async (req, res) => {
  try {
    const { text, subject } = req.body;
    const activeKeywords = await getActiveKeywords();
    const classification = classifyReply(subject || "", text || "", activeKeywords);
    res.json({
      success: true,
      classification
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/reply-rules/preview-recent", requireAdmin, async (_req, res) => {
  try {
    const db = await getDb();
    const activeKeywords = await getActiveKeywords();
    const leads = await db.collection(COLLECTIONS.LEADS).find({
      $or: [
        { status: "Replied" },
        { status: "Negative Reply" },
        { hasReplied: true },
        { lastReplyReceivedDate: { $exists: true, $ne: "" } }
      ]
    }).sort({ lastReplyReceivedDate: -1, updatedAt: -1 }).limit(10).toArray();
    const inboundReplies = await db.collection(COLLECTIONS.INBOUND_REPLIES).find({}).sort({ receivedDateTime: -1, createdAt: -1 }).limit(20).toArray();
    const previews = leads.map((l) => {
      const matchingReply = inboundReplies.find(
        (r) => l.email && r.leadEmail && r.leadEmail.toLowerCase() === l.email.toLowerCase() || l.threadId && r.threadId && r.threadId === l.threadId
      );
      const replyBody = matchingReply?.body || l.notes || "";
      const replySubject = matchingReply?.subject || "";
      const currentSentiment = l.replySentiment || (l.status === "Negative Reply" ? "negative" : "neutral");
      const sim = classifyReply(replySubject, replyBody, activeKeywords);
      return {
        leadId: l.leadId,
        name: l.name,
        email: l.email,
        company: l.company,
        replySnippet: replyBody.slice(0, 150),
        currentSentiment,
        simulatedSentiment: sim.sentiment,
        matchedPhrases: sim.matchedPhrases,
        reason: sim.reason,
        sentimentChanged: currentSentiment !== sim.sentiment
      };
    });
    res.json({
      success: true,
      count: previews.length,
      previews
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/webhooks/graph", async (req, res) => {
  try {
    const validationToken = req.query.validationToken || req.body?.validationToken;
    if (validationToken) {
      console.log("[Graph Webhook] Validation handshake received, returning token as plain text.");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(validationToken);
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const notifications = req.body?.value;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: "Bad Request: Missing notification value array" });
    }
    const expectedSecret = getWebhookClientState();
    const results = [];
    for (const item of notifications) {
      const providedClientState = item.clientState || "";
      if (!verifyWebhookClientState(providedClientState, expectedSecret)) {
        console.warn("[Graph Webhook] SECURITY REJECTION: Invalid or spoofed clientState:", providedClientState);
        return res.status(401).json({ error: "Unauthorized: clientState validation failed" });
      }
      const result = await processGraphWebhookNotification(item);
      results.push(result);
    }
    return res.status(202).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error("[Graph Webhook] Processing error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/cron/renew-subscriptions", async (req, res) => {
  try {
    console.log("[Cron] Running daily Microsoft Graph webhook subscription renewal...");
    const renewed = await renewExpiringGraphSubscriptions();
    res.json({
      success: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      subscriptions: renewed
    });
  } catch (err) {
    console.error("[Cron] Subscription renewal error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/webhooks/graph/subscribe", requireAdmin, async (req, res) => {
  try {
    const sub = await createGraphWebhookSubscription();
    res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("API /api/webhooks/graph/subscribe error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/test-send", requireAdmin, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_TEST_SEND !== "true") {
      return res.status(403).json({ success: false, error: "Test sending is disabled in production unless ALLOW_PROD_TEST_SEND is enabled" });
    }
    const { to, subject, body } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient "to" email address is required' });
    }
    const result = await sendDirectTestEmail(to, subject, body);
    res.json(result);
  } catch (err) {
    console.error("API /api/email/test-send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/*", (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
  }
  return res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found` });
});

// server/api-entry.ts
var api_entry_default = app;
export {
  api_entry_default as default
};
