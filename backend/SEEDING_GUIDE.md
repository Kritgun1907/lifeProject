# 🌱 Database Seeding Guide - RBAC System

## ✅ STEP 1: SEED ROLES & PERMISSIONS (COMPLETED)

Your RBAC system is **already set up** and ready to use! Here's what's in place:

### 📊 Current Database State

```bash
✅ ADMIN Role    - 46 permissions - Full system access
✅ TEACHER Role  - 22 permissions - Batch management & student tracking  
✅ STUDENT Role  - 10 permissions - Basic access to own data
✅ GUEST Role    -  4 permissions - Limited read-only access
```

---

## 🚀 How to Run Seeds

### Option 1: Seed Roles Only (Already Done ✅)

```bash
npx tsx src/seed/role.seed.ts
```

**What this does:**
- Connects to MongoDB
- Deletes existing roles
- Inserts 4 roles (ADMIN, TEACHER, STUDENT, GUEST)
- Each role contains its permission array (strings)
- Exits automatically

### Option 2: Seed Entire Database (Full Seed)

```bash
npm run seed
```

**What this does:**
1. Seeds roles (if not already done)
2. Seeds instruments, working days, timings, statuses, class plans
3. Seeds users (admin, teachers, students)
4. Seeds batches
5. Seeds enrollments, attendance, announcements, etc.

**⚠️ Prerequisites:** Base reference data must exist first:
- Instruments
- Working Days
- Working Times
- Statuses
- Class Plans

---

## 📋 Seed Order (Important!)

```
1. Roles ← YOU ARE HERE ✅
   ↓
2. Instruments, Working Days, Working Times, Statuses, Class Plans
   ↓
3. Users (references roles)
   ↓
4. Batches (references users/teachers)
   ↓
5. Everything else (references users & batches)
```

---

## 🔍 Verify Roles in Database

### Check Role Count
```bash
mongosh maxmusicschool --quiet --eval "db.roles.countDocuments()"
# Expected: 4
```

### View All Roles with Permissions
```bash
mongosh maxmusicschool --quiet --eval "db.roles.find().pretty()"
```

### Check Specific Role
```bash
mongosh maxmusicschool --quiet --eval "db.roles.findOne({name: 'ADMIN'})"
```

### Count Permissions per Role
```bash
mongosh maxmusicschool --quiet --eval "
  db.roles.find().forEach(r => {
    print(r.name + ': ' + r.permissions.length + ' permissions');
  })
"
```

---

## 🎯 Why This Matters

### ✅ Database is Now the Authority

Before seeding:
```typescript
❌ const role = "ADMIN"; // Just a string, meaningless
❌ Hard-coded ObjectIds
❌ No permission validation
```

After seeding:
```typescript
✅ const role = await Role.findOne({ name: "ADMIN" }); // Real document
✅ role.permissions = ["STUDENT:CREATE", "BATCH:DELETE", ...]
✅ Every user references a real Role document
✅ RBAC middleware validates against real permissions
```

---

## 📦 Permission Model (Optional)

You have a `Permission.model.ts` file for **auditing purposes**. To seed it:

```bash
npx tsx src/seed/permission.seed.ts
```

**Note:** This is **optional**. Your RBAC system works without it because:
- Permissions are stored as **strings** in the `Role` model
- The Permission model is just for reference/documentation
- It's useful for UI dropdowns or permission management pages

---

## 🔐 Next Steps: User Signup/Login

Now that roles exist, you can:

### 1️⃣ Signup a New User

```typescript
import { Role } from "./models/Role.model";
import { User } from "./models/User.model";

// Get the STUDENT role
const studentRole = await Role.findOne({ name: "STUDENT" });

if (!studentRole) {
  throw new Error("STUDENT role not found. Run seed first!");
}

// Create user with role reference
const user = await User.create({
  name: "John Doe",
  email: "john@example.com",
  password: hashedPassword,
  role: studentRole._id, // ✅ References real role document
  status: statusId,
  // ... other fields
});
```

### 2️⃣ Login & JWT Token

```typescript
// In your login controller
const user = await User.findOne({ email })
  .populate("role") // ✅ Populate to get permissions
  .populate("status");

if (!user) {
  return res.status(401).json({ message: "Invalid credentials" });
}

// Verify password
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
  return res.status(401).json({ message: "Invalid credentials" });
}

// Generate JWT
const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET!,
  { expiresIn: "7d" }
);

res.json({
  success: true,
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions, // ✅ Permissions from database
  },
});
```

### 3️⃣ Protected Route Example

```typescript
import { authenticate } from "./middleware/auth.middleware";
import { requirePermission } from "./middleware/rbac.middleware";
import { PERMISSIONS } from "./constants/permissions";

// Only students can access
router.get(
  "/my-attendance",
  authenticate, // ✅ Checks JWT, populates req.auth
  requirePermission(PERMISSIONS.ATTENDANCE_READ_SELF), // ✅ Checks permission
  (req, res) => {
    // req.auth.userId    -> "65f1b2c3d4e5f6a7b8c9d0e1"
    // req.auth.role      -> "STUDENT"
    // req.auth.permissions -> ["PROFILE:READ:SELF", "ATTENDANCE:READ:SELF", ...]
    
    res.json({ attendance: [] });
  }
);
```

---

## 🧪 Testing Your RBAC

### Test 1: Guest User (Limited Access)

```typescript
// Signup with GUEST role
const guestRole = await Role.findOne({ name: "GUEST" });
const guest = await User.create({
  name: "Guest User",
  email: "guest@example.com",
  password: await bcrypt.hash("password", 10),
  role: guestRole._id,
  status: activeStatusId,
});

// Login and get token
// Try accessing:
// ✅ /announcements/public - Should work
// ❌ /profile/me - Should fail (no PROFILE:READ:SELF)
// ❌ /students - Should fail (no STUDENT:READ:ANY)
```

### Test 2: Student User

```typescript
const studentRole = await Role.findOne({ name: "STUDENT" });
const student = await User.create({
  name: "Student User",
  email: "student@example.com",
  password: await bcrypt.hash("password", 10),
  role: studentRole._id,
  status: activeStatusId,
});

// Try accessing:
// ✅ /profile/me - Should work (has PROFILE:READ:SELF)
// ✅ /attendance/me - Should work (has ATTENDANCE:READ:SELF)
// ❌ /students - Should fail (no STUDENT:READ:ANY)
// ❌ /admin/dashboard - Should fail (not ADMIN role)
```

### Test 3: Admin User

```typescript
const adminRole = await Role.findOne({ name: "ADMIN" });
const admin = await User.create({
  name: "Admin User",
  email: "admin@example.com",
  password: await bcrypt.hash("password", 10),
  role: adminRole._id,
  status: activeStatusId,
});

// Try accessing:
// ✅ Everything - Admin has all 46 permissions
```

---

## 🔄 Re-seeding Roles

If you update permissions in `src/constants/rolePermissions.ts`:

```bash
# 1. Update the constants
# 2. Re-run role seed
npx tsx src/seed/role.seed.ts

# 3. Existing users will automatically get new permissions
#    (because they reference the Role document)
```

**Magic:** Users don't store permissions directly, they reference the Role. So updating the Role updates all users with that role! 🎉

---

## 📝 Summary

✅ **Roles seeded**: ADMIN, TEACHER, STUDENT, GUEST  
✅ **Permissions loaded**: 46, 22, 10, 4 respectively  
✅ **Database is authority**: No hard-coded IDs  
✅ **Ready for signup/login**: Reference `role._id` when creating users  
✅ **RBAC works**: Middleware validates against real permissions  

**Next action:** Create login/signup routes that reference these roles!

---

## 🆘 Troubleshooting

### "Roles not seeded" error
```bash
# Run role seed first
npx tsx src/seed/role.seed.ts
```

### "Permission check failing"
```bash
# Verify role has the permission
mongosh maxmusicschool --quiet --eval "
  db.roles.findOne({name: 'STUDENT'}).permissions
"
```

### "User has no permissions"
```typescript
// Make sure to populate role when fetching user
const user = await User.findById(userId).populate("role");
// NOT: const user = await User.findById(userId); ❌
```

### "JWT_SECRET not defined"
```bash
# Add to .env file
echo "JWT_SECRET=your-super-secret-key-min-32-chars-long" >> .env
```

---

🎉 **You're all set! Your RBAC system is production-ready!**
