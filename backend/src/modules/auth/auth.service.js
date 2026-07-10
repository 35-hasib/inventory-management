const prisma = require("../../config/prisma");
const { hashPassword, verifyPassword } = require("../../utils/password");
const { signToken } = require("../../utils/jwt");
const { slugify } = require("../../utils/slug");
const ApiError = require("../../utils/ApiError");

function publicUser(user) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

async function uniqueSlug(base) {
  let slug = slugify(base) || "company";
  let candidate = slug;
  let i = 1;
  // Loop until free (cheap; collisions are rare).
  while (await prisma.company.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

// Registers a new tenant: Company + ADMIN user + InvoiceCounter + TRIALING FREE subscription.
async function register({ companyName, name, email, password, phone }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("Email is already registered");

  const passwordHash = await hashPassword(password);
  const slug = await uniqueSlug(companyName);

  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { tier: "FREE" } });

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, slug, email, phone },
    });

    const user = await tx.user.create({
      data: {
        companyId: company.id,
        name,
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    await tx.invoiceCounter.create({ data: { companyId: company.id } });

    if (freePlan) {
      await tx.subscription.create({
        data: {
          companyId: company.id,
          planId: freePlan.id,
          status: "TRIALING",
          currentPeriodEnd: periodEnd,
          trialEndsAt: periodEnd,
        },
      });
    }

    return { company, user };
  });

  const token = signToken({
    sub: result.user.id,
    companyId: result.company.id,
    role: result.user.role,
  });

  return { token, user: publicUser(result.user), company: result.company };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid credentials");
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid credentials");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({ sub: user.id, companyId: user.companyId, role: user.role });
  return { token, user: publicUser(user) };
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  return { user: publicUser(user), company: user.company };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: true };
}

module.exports = { register, login, me, changePassword, publicUser };
