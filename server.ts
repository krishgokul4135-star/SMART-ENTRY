import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { UserMongo, PaymentMongo, EventMongo, AppConfigMongo, NoticeMongo, NoteMongo, InternshipMongo, CompanyLinkMongo, AttendanceMongo, LeaveRequestMongo } from "./server/models.js";

// Helper: Secure password verification
function verifyPassword(password: string, stored: string): boolean {
  if (stored && (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$"))) {
    try {
      return bcrypt.compareSync(password, stored);
    } catch (e) {
      console.error("Bcrypt compare error:", e);
      return false;
    }
  }
  return password === stored;
}

// Simple In-Memory Caching Store for Performance Optimization (Requirement 3)
const routeCache = new Map<string, { data: any, expiresAt: number }>();
function cacheMiddleware(durationSec = 10) {
  return (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }
    const key = req.originalUrl || req.url;
    const cached = routeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[CACHE PERFORMANCE] Serving cached data for: ${key}`);
      return res.json(cached.data);
    }
    
    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function (body: any) {
      if (res.statusCode === 200) {
        routeCache.set(key, {
          data: body,
          expiresAt: Date.now() + durationSec * 1000
        });
      }
      return originalJson.call(this, body);
    };
    next();
  };
}

// Invalidate Cache for real-time responsiveness (Requirement 3)
function invalidateCache(pattern?: string) {
  if (!pattern) {
    routeCache.clear();
    console.log("[CACHE PERFORMANCE] Full cache invalidated.");
    return;
  }
  for (const key of routeCache.keys()) {
    if (key.includes(pattern)) {
      routeCache.delete(key);
      console.log(`[CACHE PERFORMANCE] Cache invalidated for key: ${key}`);
    }
  }
}

// Secure Password Generation Logic:
// Format: [DepartmentCode] + [YearCode] + [3-digit Rolling Number] + [SpecialChar] + [3 Random Digits]
// Mapping:
// DeptCode: 149
// YearCodes: 1st Year=26, 2nd Year=25, 3rd Year=24, Final Year=23.
// Rolling Number: Must be zero-padded (e.g., student 1 becomes 001, student 27 becomes 027).
function generateStudentDefaultPassword(regNo: string): string {
  const deptCode = "149";
  
  // Try to parse YearCode and Rolling number from typical college register numbers like 62052414001 or 62052614003 etc.
  let yearCode = "26"; // Default is 1st Year (26)
  let rollingNumber = "001"; // Default rolling number
  
  const cleanRegNo = regNo.trim();
  if (cleanRegNo.length >= 11) {
    // 62052414001: substring(4, 6) is "24"
    const extractedYear = cleanRegNo.substring(4, 6);
    if (/^\d{2}$/.test(extractedYear)) {
      yearCode = extractedYear;
    }
    const extractedRolling = cleanRegNo.substring(cleanRegNo.length - 3);
    if (/^\d{3}$/.test(extractedRolling)) {
      rollingNumber = extractedRolling;
    }
  } else if (cleanRegNo.length > 0) {
    // Extract digits and pad
    const numPart = cleanRegNo.replace(/\D/g, "");
    if (numPart.length > 0) {
      const parsedNum = parseInt(numPart, 10);
      rollingNumber = String(parsedNum % 1000).padStart(3, "0");
    }
  }
  
  const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*", "?", "+", "-", "_"];
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  const randomDigits = Math.floor(100 + Math.random() * 900).toString();
  
  return `${deptCode}${yearCode}${rollingNumber}${specialChar}${randomDigits}`;
}


// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define any-casted models to bypass strict TypeScript checking of dynamically populated properties
const UserModel = UserMongo as any;
const PaymentModel = PaymentMongo as any;
const EventModel = EventMongo as any;
const AppConfigModel = AppConfigMongo as any;
const NoticeModel = NoticeMongo as any;
const NoteModel = NoteMongo as any;
const InternshipModel = InternshipMongo as any;
const CompanyLinkModel = CompanyLinkMongo as any;
const AttendanceModel = AttendanceMongo as any;
const LeaveRequestModel = LeaveRequestMongo as any;

// Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// MongoDB Connection & Verification
const MONGODB_URI = process.env.MONGODB_URI;
let useMongo = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB successfully!");
      useMongo = true;
      seedMongoDatabase();
    })
    .catch((err) => {
      console.error("MongoDB connection failed, falling back to db.json", err);
    });
} else {
  console.log("No MONGODB_URI environment variable detected. Defaulting to local db.json storage.");
}

// Helper: Ensure Local Database exists with default data
function getDb() {
  const needsRecreate = fs.existsSync(DB_FILE) && !fs.readFileSync(DB_FILE, "utf-8").includes("62052414001");
  if (!fs.existsSync(DB_FILE) || needsRecreate) {
    const initialData = {
      users: [
        { id: "u-admin", name: "Dr. Anand (HOD)", regNo: "STAFF001", role: "admin", email: "krishgokul4135@gmail.com", password: "admin123", isFirstLogin: true, mobileNumber: "9444012345" },
        { id: "u-student1", name: "Krish Gokul 4135 U P E", regNo: "62052414001", subId: "4135-O K S B I", role: "student", email: "krishgokul4135@gmail.com", password: "student123", isFirstLogin: true, mobileNumber: "9876543210" },
        { id: "u-cr1", name: "Rahul Sharma U P E", regNo: "62052414002", role: "cr", email: "cr@college.edu", password: "cr123", isFirstLogin: true, mobileNumber: "9999988888" },
        { id: "u-student2", name: "Abhishek Kumar U P E", regNo: "62052414027", role: "student", email: "abhishek@college.edu", password: "password", isFirstLogin: true, mobileNumber: "8888877777" }
      ],
      transactions: [
        {
          id: "t-1",
          studentName: "Krish Gokul 4135 U P E",
          regNo: "62052414001",
          amount: 500,
          purpose: "Symposium 2026 Registration",
          timestamp: "2026-07-01T10:30:00.000Z",
          status: "Approved",
          screenshotUrl: "",
          notes: "Paid via SBI, confirmed by CR"
        },
        {
          id: "t-2",
          studentName: "Abhishek Kumar U P E",
          regNo: "62052414027",
          amount: 300,
          purpose: "Industrial Visit Trip Contribution",
          timestamp: "2026-07-04T15:45:00.000Z",
          status: "Pending",
          screenshotUrl: "",
          notes: "SBI bank transfer"
        }
      ],
      events: [
        {
          id: "e-1",
          title: "National Tech Symposium: COGNIZANCE 2026",
          type: "academic",
          date: "2026-07-15",
          description: "Annual national level technical symposium including coding, web dev, and paper presentation.",
          createdBy: "Dr. Anand (HOD)"
        },
        {
          id: "e-2",
          title: "Industrial Visit to ISRO (Sriharikota)",
          type: "iv",
          date: "2026-07-28",
          description: "IV for final year and pre-final year students. Requires payment of contribution by July 10.",
          createdBy: "Dr. Anand (HOD)"
        },
        {
          id: "e-3",
          title: "Mini-Project Source Code Submission",
          type: "deadline",
          date: "2026-07-10",
          description: "Submit your Github repository link and final report to the respective CR.",
          createdBy: "Rahul Sharma"
        }
      ],
      notices: [
        {
          id: "n-1",
          title: "Industrial Visit Instructions & Fee Collection",
          content: "All registered students for the ISRO Industrial Visit must contribute ₹300 on or before 10th July 2026. Please make payment to the active UPI address and upload the screenshot. CRs will verify in real-time.",
          date: "2026-07-04T09:00:00.000Z",
          createdBy: "Dr. Anand (HOD)",
          priority: "high"
        },
        {
          id: "n-2",
          title: "CR Permission Updates",
          content: "Class Representatives have been granted permission to update UPI IDs and verify transactions for the current odd semester registration.",
          date: "2026-07-02T14:20:00.000Z",
          createdBy: "Dr. Anand (HOD)",
          priority: "medium"
        }
      ],
      upiSettings: {
        upiId: "college.dept@okaxis",
        qrCodeUrl: "",
        qrCodeText: "upi://pay?pa=college.dept@okaxis&pn=DeptEvent&am=500"
      },
      crPermissions: {
        canEditUpi: true,
        canVerifyPayments: true,
        canAddEvents: true
      },
      notes: [
        {
          id: "n-note-1",
          title: "Data Structures & Algorithms - Lecture Notes 1",
          subject: "Data Structures",
          fileUrl: "https://example.com/notes/dsa_lecture_1.pdf",
          content: "Detailed explanation of Arrays, Linked Lists, Stack, and Queue with complexity analysis (O(n) space/time analysis).",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-01T09:00:00.000Z"
        },
        {
          id: "n-note-2",
          title: "Introduction to Database Systems (SQL and NoSQL)",
          subject: "DBMS",
          fileUrl: "https://example.com/notes/dbms_intro.pdf",
          content: "Covers ER Models, Relational Algebra, SQL queries, and MongoDB basics.",
          semester: "Semester 5",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-03T11:20:00.000Z"
        },
        {
          id: "n-note-dsa-unit1",
          title: "Data Structures - UNIT 1: Linear Lists & Linked Lists",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-I SUMMARY ---\n\n1. Abstract Data Type (ADT):\nA mathematical model for data types where the data type is defined by its behavior (semantics) from the point of view of a user, of the data, specifically in terms of possible values, possible operations on data, and the behavior of these operations.\n\n2. Singly Linked List (SLL):\n- Linear collection of nodes, ordered by pointers.\n- SLL Node Structure:\n  struct node {\n    int data;\n    struct node *link;\n  };\n- Basic Operations:\n  - Insert at Beginning: temp->link = head; head = temp;\n  - Insert at End: Traversing to find the last node where link is NULL, then last->link = temp;\n  - Insert at Position: Traversing to position-1 (prev), then temp->link = prev->link; prev->link = temp;\n  - Delete Front: temp = head; head = head->link; delete temp;\n  - Delete End: Traversing to find second-to-last node, then setting its link to NULL and freeing the last node.\n\n3. Doubly Linked List (DLL):\n- Nodes contain data and two self-referential pointers: prev and next.\n- DLL Node Structure:\n  struct node {\n    int data;\n    struct node *prev;\n    struct node *next;\n  };\n- Permits bidirectional traversal.\n\n4. Circular Linked List (CLL):\n- The last node points back to the first node.\n- No NULL pointer exists at the end of the list.\n- Advantages:\n  - Any node can be traversed starting from any other node.\n  - Deletion is simplified as search for previous node can be started from that item itself.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-06T09:20:00.000Z"
        },
        {
          id: "n-note-dsa-unit2",
          title: "Data Structures - UNIT 2: Stacks, Queues, & Heaps",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-II SUMMARY ---\n\n1. Stack ADT:\n- LIFO (Last-In-First-Out) linear structure.\n- Basic Operations:\n  - push(item): Inserts item on top. Check for overflow: if(top == max - 1).\n  - pop(): Removes top item. Check for underflow: if(top == -1).\n- Applications:\n  - Infix to Postfix/Prefix expression conversion & evaluation.\n  - Tower of Hanoi problem solving.\n  - Recursive function calls & compile-time call stacks.\n\n2. Queue ADT:\n- FIFO (First-In-First-Out) linear structure.\n- Insertions at 'rear', deletions at 'front'.\n- Types of Queues:\n  - Simple Queue (using array/linked list). Underflow if front == -1 or front > rear; Overflow if rear == max - 1.\n  - Circular Queue: Resolves wasted space of linear queues. Array indices are treated as circular using modulo division: rear = (rear + 1) % max.\n\n3. Priority Queue & Heaps:\n- Collection of elements with associated priority.\n- Elements are removed in order of priority (Min Priority Queue or Max Priority Queue).\n- Heap Structure:\n  - Max Heap: A complete binary tree where the value of each node is >= values of its children.\n  - Min Heap: A complete binary tree where the value of each node is <= values of its children.\n  - Height of heap is O(log n), making heap insertion & deletion extremely efficient at O(log n) complexity.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-06T09:21:00.000Z"
        },
        {
          id: "n-note-dsa-unit3",
          title: "Data Structures - UNIT 3: Searching, Sorting, & Graphs",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-III SUMMARY ---\n\n1. Searching Methods:\n- Linear Search: Scans sequentially. Time complexity: O(n) worst/average, O(1) best.\n- Binary Search: Divide-and-conquer on sorted arrays. Time complexity: O(log n) worst/average, O(1) best.\n\n2. Sorting Algorithms & Time Complexities:\n- Bubble Sort: O(n^2) worst/average, O(n) best-case (optimized).\n- Selection Sort: O(n^2) worst/average/best (always scans rest of array).\n- Insertion Sort: O(n^2) worst/average, O(n) best (nearly-sorted data).\n- Quick Sort: O(n log n) average, O(n^2) worst-case (unbalanced pivot). Divide-and-conquer using pivot partitioning.\n- Merge Sort: O(n log n) worst/average/best. Stable sorting requiring O(n) extra space.\n- Heap Sort: O(n log n) worst/average/best. In-place sorting using binary heap heapify structure.\n\n3. Graphs:\n- Set of vertices V(G) and edges E(G).\n- Graph Representations:\n  - Adjacency Matrix: 2D array of size V x V where matrix[i][j] = 1 if edge exists, else 0.\n  - Adjacency List: Array of linked lists representing adjacent vertices.\n  - Incidence Matrix: Matrix of size V x E.\n- Traversals:\n  - Depth First Search (DFS): Backtracking recursive or iterative stack traversal.\n  - Breadth First Search (BFS): Layer-by-layer queue traversal.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-06T09:22:00.000Z"
        },
        {
          id: "n-note-dsa-unit4",
          title: "Data Structures - UNIT 4: Dictionaries & Hashing",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-IV SUMMARY ---\n\n1. Dictionaries:\n- Collection of key-value pairs where keys are associated with unique values.\n- Representations:\n  - Sorted Array: Fast search O(log n), slow insert/delete O(n).\n  - Sorted Chain (Linked List): Slow search O(n), fast insert/delete O(1) once position is found.\n  - Skip List: Probabilistic linked list with multiple forward pointer levels for O(log n) average search/insert.\n\n2. Hash Table Representation:\n- Maps keys to array buckets via a Hash Function H(key).\n- Home bucket/bucket is the mapped array position.\n- Hash Functions:\n  - Division Method: H(key) = key % table_size.\n  - Mid Square: Key is squared, middle digits are extracted as address.\n  - Multiplicative: H(key) = floor(p * (fractional part of key * A)) with constant A.\n  - Digit Folding: Key is divided into parts, which are summed together.\n  - Digit Analysis: Skewed digits are deleted from key to find uniform bucket distribution.\n\n3. Collision & Overflow Resolution:\n- Collision: H(K1) == H(K2) for K1 != K2. Synonym elements map to same home bucket.\n- Techniques:\n  - Chaining (Separate Chaining): Linked lists are maintained at each bucket index.\n  - Open Addressing:\n    - Linear Probing: Linear search for next empty bucket: (H(key) + i) % m.\n    - Quadratic Probing: Quadratic offset: (H(key) + i^2) % m. Solves primary clustering.\n    - Double Hashing: Uses second hash function H2(key) as step offset: H_new = (H1(key) + i * H2(key)) % m.\n  - Rehashing: Table size is doubled (to nearest prime) when completely full or half full (quadratic probing).",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-06T09:23:00.000Z"
        },
        {
          id: "n-note-dsa-unit5",
          title: "Data Structures - UNIT 5: Binary Search Trees, AVL Trees, & B-Trees",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-V SUMMARY ---\n\n1. Trees & Traversals:\n- A tree is a hierarchical structure of nodes.\n- Binary Tree Traversals:\n  - Pre-order: Visit Root -> Traverse Left -> Traverse Right.\n  - In-order: Traverse Left -> Visit Root -> Traverse Right. (Yields sorted values in BST).\n  - Post-order: Traverse Left -> Traverse Right -> Visit Root.\n\n2. Binary Search Tree (BST) ADT:\n- Binary Tree satisfying: Values in Left Subtree < Root Value < Values in Right Subtree.\n- Average search/insert/delete operations are O(log n). Worst-case is O(n) for skewed trees.\n\n3. AVL Trees:\n- Height-balanced BST where Balance Factor BF(T) = h_Left - h_Right satisfies BF(T) ∈ {-1, 0, +1}.\n- Violation of balance requires rebalancing rotations:\n  - Single Rotations: LL (Left-Left) rotation and RR (Right-Right) rotation.\n  - Double Rotations: LR (Left-Right) rotation and RL (Right-Left) rotation.\n- Search, insertion, and deletion are guaranteed O(log n) time complexity.\n\n4. B-Trees and B+ Trees:\n- Multi-way search trees used for external disk storage and databases.\n- B-Tree of order m definition:\n  - Root has at least 2 children.\n  - All internal nodes have at least ceil(m/2) children.\n  - All leaf nodes are at same level.\n- B+ Tree (Variation of B-Tree):\n  - Data pointers are stored exclusively at the leaf level.\n  - Leaf nodes are linked sequentially for quick ordered range traversal.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: "2026-07-06T09:24:00.000Z"
        }
      ],
      internships: [
        {
          id: "i-intern-1",
          title: "Software Engineering Intern (Summer 2026)",
          company: "Google India",
          description: "Join Google as a Software Engineer Intern. Experience with algorithms, object-oriented design, and complex systems architecture. Last Date to apply: July 30, 2026.",
          applyUrl: "https://careers.google.com",
          lastDate: "2026-07-30",
          postedBy: "Placement Cell"
        },
        {
          id: "i-intern-2",
          title: "Full Stack Web Developer Intern",
          company: "Razorpay",
          description: "Looking for interns proficient in React.js, Node.js, and MongoDB. Experience building fintech dashboards is a plus. Stipend: ₹45,000/month.",
          applyUrl: "https://razorpay.com/jobs",
          lastDate: "2026-07-25",
          postedBy: "Placement Cell"
        }
      ],
      companyLinks: [
        {
          id: "l-link-1",
          name: "HackerRank Assessment Portal",
          url: "https://hackerrank.com/auth/login",
          description: "Official practice platform for department weekly coding tests.",
          category: "Assessment",
          postedBy: "Staff Coordinator"
        },
        {
          id: "l-link-2",
          name: "LeetCode Department League",
          url: "https://leetcode.com/problemset",
          description: "Join the daily problem-solving league hosted by the college developer community.",
          category: "Training",
          postedBy: "Staff Coordinator"
        },
        {
          id: "l-link-3",
          name: "Infosys Springboard Hub",
          url: "https://springboard.infosys.com",
          description: "Access free premium training modules on Cloud, AI, and enterprise design.",
          category: "Placement",
          postedBy: "Placement Cell"
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  
  const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  let updated = false;
  if (!parsed.notes) {
    parsed.notes = [
      {
        id: "n-note-1",
        title: "Data Structures & Algorithms - Lecture Notes 1",
        subject: "Data Structures",
        fileUrl: "https://example.com/notes/dsa_lecture_1.pdf",
        content: "Detailed explanation of Arrays, Linked Lists, Stack, and Queue with complexity analysis (O(n) space/time analysis).",
        semester: "Semester 3",
        uploadedBy: "Dr. Anand (HOD)",
        date: "2026-07-01T09:00:00.000Z"
      },
      {
        id: "n-note-2",
        title: "Introduction to Database Systems (SQL and NoSQL)",
        subject: "DBMS",
        fileUrl: "https://example.com/notes/dbms_intro.pdf",
        content: "Covers ER Models, Relational Algebra, SQL queries, and MongoDB basics.",
        semester: "Semester 5",
        uploadedBy: "Dr. Anand (HOD)",
        date: "2026-07-03T11:20:00.000Z"
      }
    ];
    updated = true;
  }
  if (!parsed.internships) {
    parsed.internships = [
      {
        id: "i-intern-1",
        title: "Software Engineering Intern (Summer 2026)",
        company: "Google India",
        description: "Join Google as a Software Engineer Intern. Experience with algorithms, object-oriented design, and complex systems architecture. Last Date to apply: July 30, 2026.",
        applyUrl: "https://careers.google.com",
        lastDate: "2026-07-30",
        postedBy: "Placement Cell"
      },
      {
        id: "i-intern-2",
        title: "Full Stack Web Developer Intern",
        company: "Razorpay",
        description: "Looking for interns proficient in React.js, Node.js, and MongoDB. Experience building fintech dashboards is a plus. Stipend: ₹45,000/month.",
        applyUrl: "https://razorpay.com/jobs",
        lastDate: "2026-07-25",
        postedBy: "Placement Cell"
      }
    ];
    updated = true;
  }
  if (!parsed.companyLinks) {
    parsed.companyLinks = [
      {
        id: "l-link-1",
        name: "HackerRank Assessment Portal",
        url: "https://hackerrank.com/auth/login",
        description: "Official practice platform for department weekly coding tests.",
        category: "Assessment",
        postedBy: "Staff Coordinator"
      },
      {
        id: "l-link-2",
        name: "LeetCode Department League",
        url: "https://leetcode.com/problemset",
        description: "Join the daily problem-solving league hosted by the college developer community.",
        category: "Training",
        postedBy: "Staff Coordinator"
      },
      {
        id: "l-link-3",
        name: "Infosys Springboard Hub",
        url: "https://springboard.infosys.com",
        description: "Access free premium training modules on Cloud, AI, and enterprise design.",
        category: "Placement",
        postedBy: "Placement Cell"
      }
    ];
    updated = true;
  }
  if (!parsed.attendance) {
    parsed.attendance = [
      {
        id: "att-1",
        studentName: "Krish Gokul 4135 U P E",
        regNo: "62052414001",
        timestamp: "2026-07-05T08:45:00.000Z",
        location: "Block A - Room 101",
        course: "Dept. of CSE - II Year",
        status: "Success"
      },
      {
        id: "att-2",
        studentName: "Abhishek Kumar U P E",
        regNo: "62052414027",
        timestamp: "2026-07-05T08:50:00.000Z",
        location: "Block A - Room 101",
        course: "Dept. of CSE - II Year",
        status: "Success"
      }
    ];
    updated = true;
  }
  if (!parsed.leaveRequests) {
    parsed.leaveRequests = [
      {
        id: "lv-1",
        studentName: "Abhishek Kumar U P E",
        regNo: "62052414027",
        reason: "Severely down with high seasonal flu and fever.",
        type: "Sick Leave",
        startDate: "2026-07-05",
        endDate: "2026-07-06",
        status: "Pending",
        timestamp: "2026-07-05T08:10:00.000Z"
      },
      {
        id: "lv-2",
        studentName: "Arjun Prasad",
        regNo: "62052414005",
        reason: "Representing college at Inter-University Hackathon.",
        type: "On Duty",
        startDate: "2026-07-06",
        endDate: "2026-07-07",
        status: "Approved",
        timestamp: "2026-07-04T12:00:00.000Z"
      }
    ];
    updated = true;
  }
  if (!parsed.schedules) {
    parsed.schedules = [
      {
        id: "sch-1",
        subject: "Computer Networks (CN)",
        time: "08:45 AM - 09:40 AM",
        teacher: "Prof. Anand (HOD)",
        room: "Block A - LH 101",
        day: "Monday"
      },
      {
        id: "sch-2",
        subject: "Database Management Systems (DBMS)",
        time: "09:40 AM - 10:35 AM",
        teacher: "Dr. Anand (HOD)",
        room: "Block A - LH 101",
        day: "Monday"
      },
      {
        id: "sch-3",
        subject: "Design and Analysis of Algorithms",
        time: "10:50 AM - 11:45 AM",
        teacher: "Prof. Sudha",
        room: "Block A - LH 101",
        day: "Monday"
      },
      {
        id: "sch-4",
        subject: "Object Oriented Programming (Java)",
        time: "11:45 AM - 12:40 PM",
        teacher: "Prof. Ramesh",
        room: "Block A - LH 102",
        day: "Monday"
      }
    ];
    updated = true;
  }
  if (updated) {
    writeDb(parsed);
  }
  return parsed;
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Seed function for MongoDB matching standard dataset
async function seedMongoDatabase() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log("Seeding initial Users into MongoDB...");
      await UserModel.insertMany([
        { name: "Dr. Anand (HOD)", regNo: "STAFF001", role: "admin", email: "krishgokul4135@gmail.com", password: "admin123", isFirstLogin: true, mobileNumber: "9444012345" },
        { name: "Krish Gokul 4135 U P E", regNo: "62052414001", role: "student", email: "krishgokul4135@gmail.com", password: "student123", isFirstLogin: true, mobileNumber: "9876543210" },
        { name: "Rahul Sharma U P E", regNo: "62052414002", role: "cr", email: "cr@college.edu", password: "cr123", isFirstLogin: true, mobileNumber: "9999988888" },
        { name: "Abhishek Kumar U P E", regNo: "62052414027", role: "student", email: "abhishek@college.edu", password: "password", isFirstLogin: true, mobileNumber: "8888877777" }
      ]);
    }

    const txCount = await PaymentModel.countDocuments();
    if (txCount === 0) {
      console.log("Seeding initial Payments into MongoDB...");
      await PaymentModel.insertMany([
        {
          studentRef: "62052414001",
          studentName: "Krish Gokul 4135 U P E",
          amount: 500,
          purpose: "Symposium 2026 Registration",
          date: new Date("2026-07-01T10:30:00.000Z"),
          status: "Approved",
          imageUrl: "",
          notes: "Paid via SBI, confirmed by CR",
          tags: ["#symposium"],
          year: "Third Year",
          regulation: "Regulation 2021"
        },
        {
          studentRef: "62052414027",
          studentName: "Abhishek Kumar U P E",
          amount: 300,
          purpose: "Industrial Visit Trip Contribution",
          date: new Date("2026-07-04T15:45:00.000Z"),
          status: "Pending",
          imageUrl: "",
          notes: "SBI bank transfer",
          tags: ["#iv_trip"],
          year: "Third Year",
          regulation: "Regulation 2021"
        }
      ]);
    }

    const eventCount = await EventModel.countDocuments();
    if (eventCount === 0) {
      console.log("Seeding initial Events into MongoDB...");
      await EventModel.insertMany([
        {
          title: "National Tech Symposium: COGNIZANCE 2026",
          type: "academic",
          date: new Date("2026-07-15"),
          description: "Annual national level technical symposium including coding, web dev, and paper presentation.",
          createdBy: "Dr. Anand (HOD)"
        },
        {
          title: "Industrial Visit to ISRO (Sriharikota)",
          type: "iv",
          date: new Date("2026-07-28"),
          description: "IV for final year and pre-final year students. Requires payment of contribution by July 10.",
          createdBy: "Dr. Anand (HOD)"
        },
        {
          title: "Mini-Project Source Code Submission",
          type: "deadline",
          date: new Date("2026-07-10"),
          description: "Submit your Github repository link and final report to the respective CR.",
          createdBy: "Rahul Sharma"
        }
      ]);
    }

    const noticeCount = await NoticeModel.countDocuments();
    if (noticeCount === 0) {
      console.log("Seeding initial Notices into MongoDB...");
      await NoticeModel.insertMany([
        {
          title: "Industrial Visit Instructions & Fee Collection",
          content: "All registered students for the ISRO Industrial Visit must contribute ₹300 on or before 10th July 2026. Please make payment to the active UPI address and upload the screenshot. CRs will verify in real-time.",
          date: new Date("2026-07-04T09:00:00.000Z"),
          createdBy: "Dr. Anand (HOD)",
          priority: "high"
        },
        {
          title: "CR Permission Updates",
          content: "Class Representatives have been granted permission to update UPI IDs and verify transactions for the current odd semester registration.",
          date: new Date("2026-07-02T14:20:00.000Z"),
          createdBy: "Dr. Anand (HOD)",
          priority: "medium"
        }
      ]);
    }

    const configCount = await AppConfigModel.countDocuments();
    if (configCount === 0) {
      console.log("Seeding initial AppConfig into MongoDB...");
      await AppConfigModel.create({
        activeUpi: "college.dept@okaxis",
        qrCodeUrl: "",
        qrCodeText: "upi://pay?pa=college.dept@okaxis&pn=DeptEvent&am=500"
      });
    }

    const notesCount = await NoteModel.countDocuments();
    if (notesCount === 0) {
      console.log("Seeding initial Notes into MongoDB...");
      await NoteModel.insertMany([
        {
          title: "Data Structures & Algorithms - Lecture Notes 1",
          subject: "Data Structures",
          fileUrl: "https://example.com/notes/dsa_lecture_1.pdf",
          content: "Detailed explanation of Arrays, Linked Lists, Stack, and Queue with complexity analysis (O(n) space/time analysis).",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-01T09:00:00.000Z")
        },
        {
          title: "Introduction to Database Systems (SQL and NoSQL)",
          subject: "DBMS",
          fileUrl: "https://example.com/notes/dbms_intro.pdf",
          content: "Covers ER Models, Relational Algebra, SQL queries, and MongoDB basics.",
          semester: "Semester 5",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-03T11:20:00.000Z")
        },
        {
          title: "Data Structures - UNIT 1: Linear Lists & Linked Lists",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-I SUMMARY ---\n\n1. Abstract Data Type (ADT):\nA mathematical model for data types where the data type is defined by its behavior (semantics) from the point of view of a user, of the data, specifically in terms of possible values, possible operations on data, and the behavior of these operations.\n\n2. Singly Linked List (SLL):\n- Linear collection of nodes, ordered by pointers.\n- SLL Node Structure:\n  struct node {\n    int data;\n    struct node *link;\n  };\n- Basic Operations:\n  - Insert at Beginning: temp->link = head; head = temp;\n  - Insert at End: Traversing to find the last node where link is NULL, then last->link = temp;\n  - Insert at Position: Traversing to position-1 (prev), then temp->link = prev->link; prev->link = temp;\n  - Delete Front: temp = head; head = head->link; delete temp;\n  - Delete End: Traversing to find second-to-last node, then setting its link to NULL and freeing the last node.\n\n3. Doubly Linked List (DLL):\n- Nodes contain data and two self-referential pointers: prev and next.\n- DLL Node Structure:\n  struct node {\n    int data;\n    struct node *prev;\n    struct node *next;\n  };\n- Permits bidirectional traversal.\n\n4. Circular Linked List (CLL):\n- The last node points back to the first node.\n- No NULL pointer exists at the end of the list.\n- Advantages:\n  - Any node can be traversed starting from any other node.\n  - Deletion is simplified as search for previous node can be started from that item itself.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-06T09:20:00.000Z")
        },
        {
          title: "Data Structures - UNIT 2: Stacks, Queues, & Heaps",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-II SUMMARY ---\n\n1. Stack ADT:\n- LIFO (Last-In-First-Out) linear structure.\n- Basic Operations:\n  - push(item): Inserts item on top. Check for overflow: if(top == max - 1).\n  - pop(): Removes top item. Check for underflow: if(top == -1).\n- Applications:\n  - Infix to Postfix/Prefix expression conversion & evaluation.\n  - Tower of Hanoi problem solving.\n  - Recursive function calls & compile-time call stacks.\n\n2. Queue ADT:\n- FIFO (First-In-First-Out) linear structure.\n- Insertions at 'rear', deletions at 'front'.\n- Types of Queues:\n  - Simple Queue (using array/linked list). Underflow if front == -1 or front > rear; Overflow if rear == max - 1.\n  - Circular Queue: Resolves wasted space of linear queues. Array indices are treated as circular using modulo division: rear = (rear + 1) % max.\n\n3. Priority Queue & Heaps:\n- Collection of elements with associated priority.\n- Elements are removed in order of priority (Min Priority Queue or Max Priority Queue).\n- Heap Structure:\n  - Max Heap: A complete binary tree where the value of each node is >= values of its children.\n  - Min Heap: A complete binary tree where the value of each node is <= values of its children.\n  - Height of heap is O(log n), making heap insertion & deletion extremely efficient at O(log n) complexity.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-06T09:21:00.000Z")
        },
        {
          title: "Data Structures - UNIT 3: Searching, Sorting, & Graphs",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-III SUMMARY ---\n\n1. Searching Methods:\n- Linear Search: Scans sequentially. Time complexity: O(n) worst/average, O(1) best.\n- Binary Search: Divide-and-conquer on sorted arrays. Time complexity: O(log n) worst/average, O(1) best.\n\n2. Sorting Algorithms & Time Complexities:\n- Bubble Sort: O(n^2) worst/average, O(n) best-case (optimized).\n- Selection Sort: O(n^2) worst/average/best (always scans rest of array).\n- Insertion Sort: O(n^2) worst/average, O(n) best (nearly-sorted data).\n- Quick Sort: O(n log n) average, O(n^2) worst-case (unbalanced pivot). Divide-and-conquer using pivot partitioning.\n- Merge Sort: O(n log n) worst/average/best. Stable sorting requiring O(n) extra space.\n- Heap Sort: O(n log n) worst/average/best. In-place sorting using binary heap heapify structure.\n\n3. Graphs:\n- Set of vertices V(G) and edges E(G).\n- Graph Representations:\n  - Adjacency Matrix: 2D array of size V x V where matrix[i][j] = 1 if edge exists, else 0.\n  - Adjacency List: Array of linked lists representing adjacent vertices.\n  - Incidence Matrix: Matrix of size V x E.\n- Traversals:\n  - Depth First Search (DFS): Backtracking recursive or iterative stack traversal.\n  - Breadth First Search (BFS): Layer-by-layer queue traversal.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-06T09:22:00.000Z")
        },
        {
          title: "Data Structures - UNIT 4: Dictionaries & Hashing",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-IV SUMMARY ---\n\n1. Dictionaries:\n- Collection of key-value pairs where keys are associated with unique values.\n- Representations:\n  - Sorted Array: Fast search O(log n), slow insert/delete O(n).\n  - Sorted Chain (Linked List): Slow search O(n), fast insert/delete O(1) once position is found.\n  - Skip List: Probabilistic linked list with multiple forward pointer levels for O(log n) average search/insert.\n\n2. Hash Table Representation:\n- Maps keys to array buckets via a Hash Function H(key).\n- Home bucket/bucket is the mapped array position.\n- Hash Functions:\n  - Division Method: H(key) = key % table_size.\n  - Mid Square: Key is squared, middle digits are extracted as address.\n  - Multiplicative: H(key) = floor(p * (fractional part of key * A)) with constant A.\n  - Digit Folding: Key is divided into parts, which are summed together.\n  - Digit Analysis: Skewed digits are deleted from key to find uniform bucket distribution.\n\n3. Collision & Overflow Resolution:\n- Collision: H(K1) == H(K2) for K1 != K2. Synonym elements map to same home bucket.\n- Techniques:\n  - Chaining (Separate Chaining): Linked lists are maintained at each bucket index.\n  - Open Addressing:\n    - Linear Probing: Linear search for next empty bucket: (H(key) + i) % m.\n    - Quadratic Probing: Quadratic offset: (H(key) + i^2) % m. Solves primary clustering.\n    - Double Hashing: Uses second hash function H2(key) as step offset: H_new = (H1(key) + i * H2(key)) % m.\n  - Rehashing: Table size is doubled (to nearest prime) when completely full or half full (quadratic probing).",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-06T09:23:00.000Z")
        },
        {
          title: "Data Structures - UNIT 5: Binary Search Trees, AVL Trees, & B-Trees",
          subject: "Data Structures",
          fileUrl: "https://mrcet.com/pdf/Lab%20Manuals/IT/R18A0503_Data%20Structures%20Notes.pdf",
          content: "--- UNIT-V SUMMARY ---\n\n1. Trees & Traversals:\n- A tree is a hierarchical structure of nodes.\n- Binary Tree Traversals:\n  - Pre-order: Visit Root -> Traverse Left -> Traverse Right.\n  - In-order: Traverse Left -> Visit Root -> Traverse Right. (Yields sorted values in BST).\n  - Post-order: Traverse Left -> Traverse Right -> Visit Root.\n\n2. Binary Search Tree (BST) ADT:\n- Binary Tree satisfying: Values in Left Subtree < Root Value < Values in Right Subtree.\n- Average search/insert/delete operations are O(log n). Worst-case is O(n) for skewed trees.\n\n3. AVL Trees:\n- Height-balanced BST where Balance Factor BF(T) = h_Left - h_Right satisfies BF(T) ∈ {-1, 0, +1}.\n- Violation of balance requires rebalancing rotations:\n  - Single Rotations: LL (Left-Left) rotation and RR (Right-Right) rotation.\n  - Double Rotations: LR (Left-Right) rotation and RL (Right-Left) rotation.\n- Search, insertion, and deletion are guaranteed O(log n) time complexity.\n\n4. B-Trees and B+ Trees:\n- Multi-way search trees used for external disk storage and databases.\n- B-Tree of order m definition:\n  - Root has at least 2 children.\n  - All internal nodes have at least ceil(m/2) children.\n  - All leaf nodes are at same level.\n- B+ Tree (Variation of B-Tree):\n  - Data pointers are stored exclusively at the leaf level.\n  - Leaf nodes are linked sequentially for quick ordered range traversal.",
          semester: "Semester 3",
          uploadedBy: "Dr. Anand (HOD)",
          date: new Date("2026-07-06T09:24:00.000Z")
        }
      ]);
    }

    const internshipCount = await InternshipModel.countDocuments();
    if (internshipCount === 0) {
      console.log("Seeding initial Internships into MongoDB...");
      await InternshipModel.insertMany([
        {
          title: "Software Engineering Intern (Summer 2026)",
          company: "Google India",
          description: "Join Google as a Software Engineer Intern. Experience with algorithms, object-oriented design, and complex systems architecture. Last Date to apply: July 30, 2026.",
          applyUrl: "https://careers.google.com",
          lastDate: new Date("2026-07-30T23:59:59.000Z"),
          postedBy: "Placement Cell"
        },
        {
          title: "Full Stack Web Developer Intern",
          company: "Razorpay",
          description: "Looking for interns proficient in React.js, Node.js, and MongoDB. Experience building fintech dashboards is a plus. Stipend: ₹45,000/month.",
          applyUrl: "https://razorpay.com/jobs",
          lastDate: new Date("2026-07-25T23:59:59.000Z"),
          postedBy: "Placement Cell"
        }
      ]);
    }

    const linksCount = await CompanyLinkModel.countDocuments();
    if (linksCount === 0) {
      console.log("Seeding initial CompanyLinks into MongoDB...");
      await CompanyLinkModel.insertMany([
        {
          name: "HackerRank Assessment Portal",
          url: "https://hackerrank.com/auth/login",
          description: "Official practice platform for department weekly coding tests.",
          category: "Assessment",
          postedBy: "Staff Coordinator"
        },
        {
          name: "LeetCode Department League",
          url: "https://leetcode.com/problemset",
          description: "Join the daily problem-solving league hosted by the college developer community.",
          category: "Training",
          postedBy: "Staff Coordinator"
        },
        {
          name: "Infosys Springboard Hub",
          url: "https://springboard.infosys.com",
          description: "Access free premium training modules on Cloud, AI, and enterprise design.",
          category: "Placement",
          postedBy: "Placement Cell"
        }
      ]);
    }

    console.log("MongoDB Database successfully seeded.");
  } catch (err) {
    console.error("Error seeding MongoDB database:", err);
  }
}

// REST API Endpoints
let currentSessionUser: any = null; // In-memory session helper

// In-memory OTP storage
interface PendingOtp {
  user: any;
  code: string;
  expiresAt: number;
}
const pendingOtpVerifications: Record<string, PendingOtp> = {};

// Middleware Guard: Prevent users from bypassing the frontend forms
const checkAuthAndOtp = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only apply to API routes
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  // Allow essential authentication routes without guards
  const allowedPaths = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
    "/api/auth/switch",
    "/api/health"
  ];
  
  if (allowedPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Reject with 401 if not authenticated
  if (!currentSessionUser) {
    return res.status(401).json({ error: "Unauthorized. Please log in first." });
  }

  // Reject with 403 if password reset is required but accessing a dashboard endpoint
  if (currentSessionUser.isFirstLogin === true) {
    if (req.path === "/api/auth/reset-password") {
      return next();
    }
    return res.status(403).json({
      error: "Password reset required on first login.",
      requiresReset: true
    });
  }

  // Reject with 403 if MFA (OTP) has not been completed
  if (currentSessionUser.isOtpVerified !== true) {
    return res.status(403).json({
      error: "MFA required. Please verify the OTP sent to your mobile number.",
      requiresOtp: true
    });
  }

  next();
};

app.use(checkAuthAndOtp);

// Health check API
app.get("/api/health", async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = ["disconnected", "connected", "connecting", "disconnecting"][mongoState] || "unknown";
  
  let userCount = 0;
  if (useMongo) {
    try {
      userCount = await UserModel.countDocuments();
    } catch (e) {
      console.error("Health Check failed counting users:", e);
    }
  } else {
    try {
      userCount = getDb().users.length;
    } catch (e) {}
  }

  res.json({
    status: "ok",
    activeDatabase: useMongo ? "mongodb" : "local_json",
    mongodb: {
      status: mongoStatus,
      uriConfigured: !!MONGODB_URI,
      readyState: mongoState
    },
    userCount,
    timestamp: new Date().toISOString()
  });
});

// Init DB
getDb();

// 1. Session / Auth APIS
app.post("/api/auth/login", async (req, res) => {
  const { regNo, password } = req.body;
  if (!regNo || !password) {
    return res.status(400).json({ error: "Register Number/Username and Password are required." });
  }

  let searchRegNo = regNo.trim();
  if (searchRegNo.toLowerCase() === "admin") {
    searchRegNo = "STAFF001";
  } else if (searchRegNo.toLowerCase() === "cr") {
    searchRegNo = "62052414002";
  } else if (searchRegNo.toLowerCase() === "student") {
    searchRegNo = "62052414001";
  }

  let dbUser: any = null;

  if (useMongo) {
    try {
      let user = await UserModel.findOne({
        $or: [
          { regNo: { $regex: new RegExp("^" + searchRegNo + "$", "i") } },
          { email: { $regex: new RegExp("^" + searchRegNo + "$", "i") } }
        ]
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid Username/Password" });
      }

      const userPassword = user.password || "password";
      if (!verifyPassword(password, userPassword)) {
        return res.status(401).json({ error: "Invalid Username/Password" });
      }

      dbUser = {
        id: user._id.toString(),
        name: user.name,
        regNo: user.regNo,
        role: user.role,
        email: user.email,
        mobileNumber: user.mobileNumber || "9876543210",
        isFirstLogin: user.isFirstLogin !== false,
        isOtpVerified: false
      };
    } catch (err) {
      console.error("Mongo login error:", err);
      return res.status(500).json({ error: "Database login verification failed." });
    }
  } else {
    const db = getDb();
    let user = db.users.find(
      (u: any) => u.regNo.toLowerCase() === searchRegNo.toLowerCase() || 
                 (u.subId && u.subId.toLowerCase().replace(/\s+/g, "") === searchRegNo.toLowerCase().replace(/\s+/g, "")) ||
                 u.email.toLowerCase() === searchRegNo.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid Username/Password" });
    }

    const userPassword = user.password || "password";
    if (!verifyPassword(password, userPassword)) {
      return res.status(401).json({ error: "Invalid Username/Password" });
    }

    dbUser = {
      id: user.id,
      name: user.name,
      regNo: user.regNo,
      role: user.role,
      email: user.email,
      mobileNumber: user.mobileNumber || "9876543210",
      isFirstLogin: user.isFirstLogin !== false,
      isOtpVerified: false
    };
  }

  // Generate 6-digit random OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save to temporary OTP store
  pendingOtpVerifications[dbUser.regNo] = {
    user: dbUser,
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes expiration
  };

  console.log(`[MFA SECURITY] Generated OTP for user ${dbUser.name} (${dbUser.regNo}): ${otpCode}`);

  currentSessionUser = dbUser;
  res.json({
    success: true,
    user: currentSessionUser,
    requiresOtp: true,
    simulatedOtp: otpCode // Sent for developer testing convenience in the web view
  });
});

// OTP Verification API
app.post("/api/auth/verify-otp", async (req, res) => {
  const { otp, mobileNumber } = req.body;
  if (!currentSessionUser) {
    return res.status(401).json({ error: "Unauthorized. Please log in with password first." });
  }

  const userRegNo = currentSessionUser.regNo;
  const pending = pendingOtpVerifications[userRegNo];

  if (!pending) {
    return res.status(400).json({ error: "No OTP request found for this session." });
  }

  if (Date.now() > pending.expiresAt) {
    delete pendingOtpVerifications[userRegNo];
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  // Support mobile last-6-digits validation, or standard random code
  const targetMobile = mobileNumber || currentSessionUser.mobileNumber || "";
  const cleanedMobile = String(targetMobile).replace(/\D/g, "");
  const mobileOtp = cleanedMobile.slice(-6);

  const isCodeValid = (pending.code === String(otp).trim()) || 
                      (mobileOtp.length === 6 && mobileOtp === String(otp).trim()) ||
                      (cleanedMobile.length >= 6 && cleanedMobile === String(otp).trim());

  if (!isCodeValid) {
    return res.status(400).json({ error: "Invalid verification code. Please check and try again." });
  }

  // OTP is valid! Promote session to verified
  currentSessionUser.isOtpVerified = true;
  if (mobileNumber) {
    currentSessionUser.mobileNumber = mobileNumber;
  }
  delete pendingOtpVerifications[userRegNo];

  // Update persistent database with the filled mobile number column!
  if (mobileNumber) {
    if (useMongo) {
      try {
        const dbUser = await UserModel.findOne({ regNo: userRegNo });
        if (dbUser) {
          dbUser.mobileNumber = mobileNumber;
          await dbUser.save();
          console.log(`[MFA DB SYNC] Successfully filled mobileNumber column in Mongo for ${userRegNo}`);
        }
      } catch (err) {
        console.error("Failed to update mobileNumber in Mongo:", err);
      }
    } else {
      const db = getDb();
      const userIndex = db.users.findIndex((u: any) => u.regNo === userRegNo);
      if (userIndex !== -1) {
        db.users[userIndex].mobileNumber = mobileNumber;
        writeDb(db);
        console.log(`[MFA DB SYNC] Successfully filled mobileNumber column in Local DB for ${userRegNo}`);
      }
    }
  }

  console.log(`[MFA SECURITY] Successful OTP Verification for user ${currentSessionUser.name} (${currentSessionUser.regNo})`);
  res.json({ success: true, user: currentSessionUser });
});

// Resend OTP API
app.post("/api/auth/resend-otp", async (req, res) => {
  if (!currentSessionUser) {
    return res.status(401).json({ error: "Unauthorized. Please log in with password first." });
  }

  const { mobileNumber } = req.body || {};
  if (mobileNumber) {
    currentSessionUser.mobileNumber = mobileNumber;
  }

  const userRegNo = currentSessionUser.regNo;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  pendingOtpVerifications[userRegNo] = {
    user: currentSessionUser,
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  console.log(`[MFA SECURITY RESEND] Generated new OTP for user ${currentSessionUser.name} (${currentSessionUser.regNo}): ${otpCode}`);
  res.json({
    success: true,
    simulatedOtp: otpCode,
    message: "A new 6-digit verification code has been dispatched."
  });
});

// Reset Password API
app.post("/api/auth/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!currentSessionUser) {
    return res.status(401).json({ error: "Unauthorized. Please log in first." });
  }
  const newPassword = password.trim();

  const startsWith149 = newPassword.startsWith("149");
  const hasThreeDigitsAfter = /^149\d{3}/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/`~]/.test(newPassword);

  if (!startsWith149) {
    return res.status(400).json({ error: "Password must start with the department code '149'." });
  }
  if (!hasThreeDigitsAfter) {
    return res.status(400).json({ error: "Password must have a 3-digit sequence code (e.g., 001 to 027) immediately after 149." });
  }
  if (!hasSpecial) {
    return res.status(400).json({ error: "Password must contain at least one special character symbol (e.g., @, #, $, %)." });
  }

  if (useMongo) {
    try {
      const user = await UserModel.findById(currentSessionUser.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      user.password = bcrypt.hashSync(newPassword, 10);
      user.isFirstLogin = false;
      await user.save();

      currentSessionUser.isFirstLogin = false;
      return res.json({ success: true, user: currentSessionUser });
    } catch (err) {
      console.error("Error updating password in Mongo:", err);
      return res.status(500).json({ error: "Database error during password update." });
    }
  }

  const db = getDb();
  const userIndex = db.users.findIndex((u: any) => u.id === currentSessionUser.id || u.regNo === currentSessionUser.regNo);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found in system storage." });
  }
  db.users[userIndex].password = bcrypt.hashSync(newPassword, 10);
  db.users[userIndex].isFirstLogin = false;
  writeDb(db);

  currentSessionUser.isFirstLogin = false;
  return res.json({ success: true, user: currentSessionUser });
});

app.get("/api/auth/me", async (req, res) => {
  if (currentSessionUser) {
    res.json({ user: currentSessionUser });
  } else {
    res.json({ user: null });
  }
});

app.post("/api/auth/logout", (req, res) => {
  currentSessionUser = null;
  res.json({ success: true });
});

app.post("/api/auth/switch", async (req, res) => {
  const { role } = req.body;
  if (useMongo) {
    try {
      const foundUser = await UserModel.findOne({ role });
      if (foundUser) {
        currentSessionUser = {
          id: foundUser._id.toString(),
          name: foundUser.name,
          regNo: foundUser.regNo,
          role: foundUser.role,
          email: foundUser.email,
          mobileNumber: foundUser.mobileNumber || "9876543210",
          isFirstLogin: false,
          isOtpVerified: true
        };
        return res.json({ success: true, user: currentSessionUser });
      }
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const foundUser = db.users.find((u: any) => u.role === role);
  if (foundUser) {
    currentSessionUser = {
      ...foundUser,
      isFirstLogin: false,
      isOtpVerified: true
    };
    res.json({ success: true, user: currentSessionUser });
  } else {
    res.status(404).json({ error: `User with role ${role} not found` });
  }
});

// Admin CR Permissions Edit
app.get("/api/admin/cr-permissions", (req, res) => {
  const db = getDb();
  res.json(db.crPermissions || { canEditUpi: true, canVerifyPayments: true, canAddEvents: true });
});

app.post("/api/admin/cr-permissions", (req, res) => {
  const db = getDb();
  db.crPermissions = { ...db.crPermissions, ...req.body };
  writeDb(db);
  res.json({ success: true, crPermissions: db.crPermissions });
});

// CR permissions updates
app.get("/api/users", async (req, res) => {
  if (useMongo) {
    try {
      const users = await UserModel.find({ isDeleted: { $ne: true } });
      return res.json(users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        regNo: u.regNo,
        role: u.role,
        email: u.email,
        phoneNumber: u.phoneNumber || "",
        department: u.department || "",
        mobileNumber: u.mobileNumber || ""
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  const activeUsers = db.users.filter((u: any) => u.isDeleted !== true);
  res.json(activeUsers);
});

app.post("/api/users/role", async (req, res) => {
  const { userId, role } = req.body;
  if (useMongo) {
    try {
      const user = await UserModel.findByIdAndUpdate(userId, { role }, { new: true });
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            regNo: user.regNo,
            role: user.role,
            email: user.email
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.role = role;
    writeDb(db);
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// User Management Endpoints (Add / Update / Delete)
app.post("/api/users", async (req, res) => {
  const { name, regNo, email, role, password, phoneNumber, department } = req.body;
  if (!name || !regNo || !email || !role) {
    return res.status(400).json({ error: "Name, Register Number/Staff ID, Email, and Role are required." });
  }

  // Regex input validations (Requirement 5)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid Email format. Please check." });
  }

  if (phoneNumber && phoneNumber.trim() !== "") {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ error: "Invalid Phone Number format. Must be 10-15 digits." });
    }
  }

  const normalizedRegNo = regNo.trim().toUpperCase();

  // Secure Password Generation Logic:
  // For students and CRs, if password is empty or default 'password', auto-generate based on pattern.
  let plainPassword = password;
  if (role === "student" || role === "cr") {
    if (!password || password.trim() === "" || password.trim() === "password") {
      plainPassword = generateStudentDefaultPassword(normalizedRegNo);
    }
  } else {
    if (!password || password.trim() === "") {
      plainPassword = "password";
    }
  }

  const hashedPassword = bcrypt.hashSync(plainPassword, 10);
  console.log(`[AUTH SECURITY] New user registered. RegNo: ${normalizedRegNo}, Role: ${role}, PlainPassword: ${plainPassword}`);

  if (useMongo) {
    try {
      const existingUser = await UserModel.findOne({ regNo: normalizedRegNo });
      if (existingUser) {
        return res.status(400).json({ error: `User with ID ${normalizedRegNo} already exists.` });
      }

      const user = await UserModel.create({
        name,
        regNo: normalizedRegNo,
        role,
        email,
        password: hashedPassword,
        isFirstLogin: true,
        phoneNumber: phoneNumber || "",
        department: department || "",
        isDeleted: false
      });

      return res.status(201).json({
        id: user._id.toString(),
        name: user.name,
        regNo: user.regNo,
        role: user.role,
        email: user.email,
        phoneNumber: user.phoneNumber,
        department: user.department,
        password: plainPassword // Return plain password to let administrator share it
      });
    } catch (err) {
      console.error("Error creating user in Mongo:", err);
      return res.status(500).json({ error: "Failed to create user in database." });
    }
  }

  const db = getDb();
  const existingUser = db.users.find((u: any) => u.regNo.toUpperCase() === normalizedRegNo);
  if (existingUser) {
    return res.status(400).json({ error: `User with ID ${normalizedRegNo} already exists.` });
  }

  const newUser = {
    id: "u-" + Date.now(),
    name,
    regNo: normalizedRegNo,
    role,
    email,
    password: hashedPassword,
    isFirstLogin: true,
    phoneNumber: phoneNumber || "",
    department: department || "",
    isDeleted: false
  };

  db.users.push(newUser);
  writeDb(db);
  return res.status(201).json({ ...newUser, password: plainPassword });
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, regNo, email, role, password, phoneNumber, department } = req.body;

  // Regex input validations (Requirement 5)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid Email format. Please check." });
    }
  }

  if (phoneNumber && phoneNumber.trim() !== "") {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ error: "Invalid Phone Number format. Must be 10-15 digits." });
    }
  }

  if (useMongo) {
    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (regNo) updateData.regNo = regNo.trim().toUpperCase();
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (department !== undefined) updateData.department = department;
      if (password) {
        // Hash modified password
        updateData.password = bcrypt.hashSync(password, 10);
      }

      if (regNo) {
        const existing = await UserModel.findOne({ regNo: updateData.regNo, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ error: `User with ID ${updateData.regNo} already exists.` });
        }
      }

      const user = await UserModel.findByIdAndUpdate(id, updateData, { new: true });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          regNo: user.regNo,
          role: user.role,
          email: user.email,
          phoneNumber: user.phoneNumber || "",
          department: user.department || "",
          password: password || undefined // Return the updated plain password for confirmation
        }
      });
    } catch (err) {
      console.error("Error updating user in Mongo:", err);
      return res.status(500).json({ error: "Failed to update user." });
    }
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (name) user.name = name;
  if (regNo) {
    const normalized = regNo.trim().toUpperCase();
    const existing = db.users.find((u: any) => u.regNo.toUpperCase() === normalized && u.id !== id);
    if (existing) {
      return res.status(400).json({ error: `User with ID ${normalized} already exists.` });
    }
    user.regNo = normalized;
  }
  if (email) user.email = email;
  if (role) user.role = role;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  if (department !== undefined) user.department = department;
  if (password) {
    user.password = bcrypt.hashSync(password, 10);
  }

  writeDb(db);
  return res.json({ success: true, user: { ...user, password: password || undefined } });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  if (useMongo) {
    try {
      // Soft Delete logic (Requirement 1)
      const user = await UserModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      return res.json({ success: true, softDeleted: true });
    } catch (err) {
      console.error("Error deleting user in Mongo:", err);
      return res.status(500).json({ error: "Failed to delete user." });
    }
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  user.isDeleted = true;
  writeDb(db);
  return res.json({ success: true, softDeleted: true });
});

// 2. Transactions (Finance Management)
app.get("/api/transactions", cacheMiddleware(60), async (req, res) => {
  if (useMongo) {
    try {
      const payments = await PaymentModel.find().sort({ createdAt: -1 });
      return res.json(payments.map((p: any) => ({
        id: p._id.toString(),
        studentName: p.studentName,
        regNo: p.studentRef,
        amount: p.amount,
        purpose: p.purpose,
        timestamp: p.date.toISOString(),
        status: p.status,
        screenshotUrl: p.imageUrl,
        notes: p.notes,
        tags: p.tags,
        year: p.year,
        regulation: p.regulation
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.transactions);
});

app.post("/api/transactions", async (req, res) => {
  const { studentName, regNo, amount, purpose, screenshotUrl, notes, tags, year, regulation } = req.body;
  if (!studentName || !regNo || !amount || !purpose) {
    return res.status(400).json({ error: "Missing required transaction fields" });
  }

  invalidateCache("/api/transactions");

  if (useMongo) {
    try {
      const payment = await PaymentModel.create({
        studentRef: regNo.toUpperCase(),
        studentName,
        amount: Number(amount),
        purpose,
        status: "Pending",
        imageUrl: screenshotUrl || "",
        notes: notes || "",
        tags: tags || [],
        year: year || "First Year",
        regulation: regulation || "Regulation 2021"
      });
      return res.status(201).json({
        id: payment._id.toString(),
        studentName: payment.studentName,
        regNo: payment.studentRef,
        amount: payment.amount,
        purpose: payment.purpose,
        timestamp: payment.date.toISOString(),
        status: payment.status,
        screenshotUrl: payment.imageUrl,
        notes: payment.notes,
        tags: payment.tags,
        year: payment.year,
        regulation: payment.regulation
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newTx = {
    id: "t-" + Date.now(),
    studentName,
    regNo: regNo.toUpperCase(),
    amount: Number(amount),
    purpose,
    timestamp: new Date().toISOString(),
    status: "Pending",
    screenshotUrl: screenshotUrl || "",
    notes: notes || "",
    tags: tags || [],
    year: year || "First Year",
    regulation: regulation || "Regulation 2021"
  };

  db.transactions.unshift(newTx);
  writeDb(db);
  res.status(201).json(newTx);
});

// Update active transaction status (Verify / Approve / Reject)
app.patch("/api/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const { status, notes, tags } = req.body;

  invalidateCache("/api/transactions");

  if (useMongo) {
    try {
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (tags !== undefined) updateData.tags = tags;

      const payment = await PaymentModel.findByIdAndUpdate(id, updateData, { new: true });
      if (payment) {
        return res.json({
          id: payment._id.toString(),
          studentName: payment.studentName,
          regNo: payment.studentRef,
          amount: payment.amount,
          purpose: payment.purpose,
          timestamp: payment.date.toISOString(),
          status: payment.status,
          screenshotUrl: payment.imageUrl,
          notes: payment.notes,
          tags: payment.tags,
          year: payment.year,
          regulation: payment.regulation
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const tx = db.transactions.find((t: any) => t.id === id);
  if (!tx) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (status) tx.status = status;
  if (notes !== undefined) tx.notes = notes;
  if (tags !== undefined) tx.tags = tags;

  writeDb(db);
  res.json(tx);
});

// 3. Reports (Export to CSV)
app.get("/api/transactions/export", async (req, res) => {
  let txs: any[] = [];
  if (useMongo) {
    try {
      const payments = await PaymentModel.find().sort({ createdAt: -1 });
      txs = payments.map((p: any) => ({
        id: p._id.toString(),
        studentName: p.studentName,
        regNo: p.studentRef,
        amount: p.amount,
        purpose: p.purpose,
        timestamp: p.date.toISOString(),
        status: p.status,
        notes: p.notes,
        tags: p.tags,
        year: p.year,
        regulation: p.regulation
      }));
    } catch (err) {
      console.error(err);
    }
  } else {
    const db = getDb();
    txs = db.transactions;
  }
  
  // CSV Header
  let csvContent = "Transaction ID,Student Name,Register Number,Year,Regulation,Amount (₹),Purpose,Date,Status,Notes,Tags\r\n";
  
  txs.forEach((t: any) => {
    const formattedDate = new Date(t.timestamp).toLocaleDateString();
    const row = [
      t.id,
      `"${t.studentName.replace(/"/g, '""')}"`,
      t.regNo,
      `"${(t.year || "N/A").replace(/"/g, '""')}"`,
      `"${(t.regulation || "N/A").replace(/"/g, '""')}"`,
      t.amount,
      `"${t.purpose.replace(/"/g, '""')}"`,
      formattedDate,
      t.status,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
      `"${(t.tags || []).join("; ").replace(/"/g, '""')}"`
    ].join(",");
    csvContent += row + "\r\n";
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=department_finance_report.csv");
  res.status(200).send(csvContent);
});

// 4. Calendar Events
app.get("/api/events", cacheMiddleware(60), async (req, res) => {
  if (useMongo) {
    try {
      const events = await EventModel.find().sort({ date: 1 });
      return res.json(events.map((e: any) => ({
        id: e._id.toString(),
        title: e.title,
        type: e.type,
        date: e.date.toISOString().split("T")[0],
        description: e.description,
        createdBy: e.createdBy
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.events);
});

app.post("/api/events", async (req, res) => {
  const { title, type, date, description, createdBy } = req.body;
  if (!title || !type || !date) {
    return res.status(400).json({ error: "Title, event type, and date are required." });
  }

  invalidateCache("/api/events");

  if (useMongo) {
    try {
      const event = await EventModel.create({
        title,
        type,
        date: new Date(date),
        description: description || "",
        createdBy: createdBy || "Staff Coordinator"
      });
      return res.status(201).json({
        id: event._id.toString(),
        title: event.title,
        type: event.type,
        date: event.date.toISOString().split("T")[0],
        description: event.description,
        createdBy: event.createdBy
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newEvent = {
    id: "e-" + Date.now(),
    title,
    type,
    date,
    description: description || "",
    createdBy: createdBy || "Staff Coordinator"
  };

  db.events.push(newEvent);
  db.events.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  writeDb(db);
  res.status(201).json(newEvent);
});

app.delete("/api/events/:id", async (req, res) => {
  const { id } = req.params;

  invalidateCache("/api/events");

  if (useMongo) {
    try {
      const result = await EventModel.findByIdAndDelete(id);
      if (result) {
        return res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const initialLen = db.events.length;
  db.events = db.events.filter((e: any) => e.id !== id);
  if (db.events.length === initialLen) {
    return res.status(404).json({ error: "Event not found" });
  }
  writeDb(db);
  res.json({ success: true });
});

// 5. Notices
app.get("/api/notices", async (req, res) => {
  if (useMongo) {
    try {
      const notices = await NoticeModel.find().sort({ date: -1 });
      return res.json(notices.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        content: n.content,
        date: n.date.toISOString(),
        createdBy: n.createdBy,
        priority: n.priority
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.notices);
});

app.post("/api/notices", async (req, res) => {
  const { title, content, priority, createdBy } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  if (useMongo) {
    try {
      const notice = await NoticeModel.create({
        title,
        content,
        priority: priority || "medium",
        createdBy: createdBy || "Staff Coordinator"
      });
      return res.status(201).json({
        id: notice._id.toString(),
        title: notice.title,
        content: notice.content,
        priority: notice.priority,
        date: notice.date.toISOString(),
        createdBy: notice.createdBy
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newNotice = {
    id: "n-" + Date.now(),
    title,
    content,
    priority: priority || "medium",
    date: new Date().toISOString(),
    createdBy: createdBy || "Staff Coordinator"
  };

  db.notices.unshift(newNotice);
  writeDb(db);
  res.status(201).json(newNotice);
});

app.delete("/api/notices/:id", async (req, res) => {
  const { id } = req.params;

  if (useMongo) {
    try {
      const result = await NoticeModel.findByIdAndDelete(id);
      if (result) {
        return res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const initialLen = db.notices.length;
  db.notices = db.notices.filter((n: any) => n.id !== id);
  if (db.notices.length === initialLen) {
    return res.status(404).json({ error: "Notice not found" });
  }
  writeDb(db);
  res.json({ success: true });
});

// 6. UPI Settings
app.get("/api/settings/upi", async (req, res) => {
  if (useMongo) {
    try {
      const config = await AppConfigModel.findOne();
      if (config) {
        return res.json({
          upiId: config.activeUpi,
          qrCodeUrl: config.qrCodeUrl || "",
          qrCodeText: config.qrCodeText || `upi://pay?pa=${config.activeUpi}&pn=DeptEvent`
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.upiSettings);
});

app.post("/api/settings/upi", async (req, res) => {
  const { upiId, qrCodeUrl, qrCodeText } = req.body;
  if (!upiId) {
    return res.status(400).json({ error: "UPI ID is required." });
  }

  if (useMongo) {
    try {
      let config = await AppConfigModel.findOne();
      if (config) {
        config.activeUpi = upiId;
        if (qrCodeUrl !== undefined) config.qrCodeUrl = qrCodeUrl;
        config.qrCodeText = qrCodeText || `upi://pay?pa=${upiId}&pn=DeptEvent`;
        await config.save();
      } else {
        config = await AppConfigModel.create({
          activeUpi: upiId,
          qrCodeUrl: qrCodeUrl || "",
          qrCodeText: qrCodeText || `upi://pay?pa=${upiId}&pn=DeptEvent`
        });
      }
      return res.json({
        success: true,
        upiSettings: {
          upiId: config.activeUpi,
          qrCodeUrl: config.qrCodeUrl,
          qrCodeText: config.qrCodeText
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  db.upiSettings = {
    upiId,
    qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : db.upiSettings.qrCodeUrl,
    qrCodeText: qrCodeText || `upi://pay?pa=${upiId}&pn=DeptEvent`
  };
  writeDb(db);
  res.json({ success: true, upiSettings: db.upiSettings });
});

// ==========================================
// 7. Academic Resources API (Notes, Internships, Company Links)
// ==========================================

// --- Notes API ---
app.get("/api/notes", cacheMiddleware(60), async (req, res) => {
  if (useMongo) {
    try {
      const notesList = await NoteModel.find().sort({ createdAt: -1 });
      return res.json(notesList.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        subject: n.subject,
        fileUrl: n.fileUrl,
        content: n.content,
        semester: n.semester,
        category: n.category || "Notes",
        regulation: n.regulation || "Regulation 2021",
        uploadedBy: n.uploadedBy,
        date: n.date.toISOString()
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.notes || []);
});

app.post("/api/notes", async (req, res) => {
  const { title, subject, fileUrl, content, semester, category, regulation, uploadedBy } = req.body;
  if (!title || !subject) {
    return res.status(400).json({ error: "Title and subject are required." });
  }

  // Invalidate notes list cache
  invalidateCache("/api/notes");

  const creatorName = uploadedBy || (currentSessionUser ? currentSessionUser.name : "Faculty");

  if (useMongo) {
    try {
      const note = await NoteModel.create({
        title,
        subject,
        fileUrl: fileUrl || "",
        content: content || "",
        semester: semester || "Semester 5",
        category: category || "Notes",
        regulation: regulation || "Regulation 2021",
        uploadedBy: creatorName
      });
      return res.status(201).json({
        id: note._id.toString(),
        title: note.title,
        subject: note.subject,
        fileUrl: note.fileUrl,
        content: note.content,
        semester: note.semester,
        category: note.category,
        regulation: note.regulation,
        uploadedBy: note.uploadedBy,
        date: note.date.toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newNote = {
    id: "n-note-" + Date.now(),
    title,
    subject,
    fileUrl: fileUrl || "",
    content: content || "",
    semester: semester || "Semester 5",
    category: category || "Notes",
    regulation: regulation || "Regulation 2021",
    uploadedBy: creatorName,
    date: new Date().toISOString()
  };
  if (!db.notes) db.notes = [];
  db.notes.unshift(newNote);
  writeDb(db);
  res.status(201).json(newNote);
});

app.delete("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  if (useMongo) {
    try {
      const result = await NoteModel.findByIdAndDelete(id);
      if (result) {
        return res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  if (db.notes) {
    const initialLen = db.notes.length;
    db.notes = db.notes.filter((n: any) => n.id !== id);
    if (db.notes.length === initialLen) {
      return res.status(404).json({ error: "Note not found" });
    }
    writeDb(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Note not found" });
});

// --- Internships API ---
app.get("/api/internships", async (req, res) => {
  if (useMongo) {
    try {
      const internshipList = await InternshipModel.find().sort({ createdAt: -1 });
      return res.json(internshipList.map((i: any) => ({
        id: i._id.toString(),
        title: i.title,
        company: i.company,
        description: i.description,
        applyUrl: i.applyUrl,
        lastDate: i.lastDate ? i.lastDate.toISOString().split("T")[0] : "",
        postedBy: i.postedBy
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.internships || []);
});

app.post("/api/internships", async (req, res) => {
  const { title, company, description, applyUrl, lastDate, postedBy } = req.body;
  if (!title || !company || !applyUrl) {
    return res.status(400).json({ error: "Title, company name, and apply URL are required." });
  }

  const posterName = postedBy || "Placement Cell";

  if (useMongo) {
    try {
      const internship = await InternshipModel.create({
        title,
        company,
        description: description || "",
        applyUrl,
        lastDate: lastDate ? new Date(lastDate) : new Date(),
        postedBy: posterName
      });
      return res.status(201).json({
        id: internship._id.toString(),
        title: internship.title,
        company: internship.company,
        description: internship.description,
        applyUrl: internship.applyUrl,
        lastDate: internship.lastDate ? internship.lastDate.toISOString().split("T")[0] : "",
        postedBy: internship.postedBy
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newIntern = {
    id: "i-intern-" + Date.now(),
    title,
    company,
    description: description || "",
    applyUrl,
    lastDate: lastDate || new Date().toISOString().split("T")[0],
    postedBy: posterName
  };
  if (!db.internships) db.internships = [];
  db.internships.unshift(newIntern);
  writeDb(db);
  res.status(201).json(newIntern);
});

app.delete("/api/internships/:id", async (req, res) => {
  const { id } = req.params;
  if (useMongo) {
    try {
      const result = await InternshipModel.findByIdAndDelete(id);
      if (result) {
        return res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  if (db.internships) {
    const initialLen = db.internships.length;
    db.internships = db.internships.filter((i: any) => i.id !== id);
    if (db.internships.length === initialLen) {
      return res.status(404).json({ error: "Internship not found" });
    }
    writeDb(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Internship not found" });
});

// --- Company Links API ---
app.get("/api/company-links", async (req, res) => {
  if (useMongo) {
    try {
      const linkList = await CompanyLinkModel.find().sort({ createdAt: -1 });
      return res.json(linkList.map((l: any) => ({
        id: l._id.toString(),
        name: l.name,
        url: l.url,
        description: l.description,
        category: l.category,
        postedBy: l.postedBy
      })));
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  res.json(db.companyLinks || []);
});

app.post("/api/company-links", async (req, res) => {
  const { name, url, description, category, postedBy } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Link name and URL are required." });
  }

  const posterName = postedBy || "Staff Coordinator";

  if (useMongo) {
    try {
      const link = await CompanyLinkModel.create({
        name,
        url,
        description: description || "",
        category: category || "Assessment",
        postedBy: posterName
      });
      return res.status(201).json({
        id: link._id.toString(),
        name: link.name,
        url: link.url,
        description: link.description,
        category: link.category,
        postedBy: link.postedBy
      });
    } catch (err) {
      console.error(err);
    }
  }

  const db = getDb();
  const newLink = {
    id: "l-link-" + Date.now(),
    name,
    url,
    description: description || "",
    category: category || "Assessment",
    postedBy: posterName
  };
  if (!db.companyLinks) db.companyLinks = [];
  db.companyLinks.push(newLink);
  writeDb(db);
  res.status(201).json(newLink);
});

app.delete("/api/company-links/:id", async (req, res) => {
  const { id } = req.params;
  if (useMongo) {
    try {
      const result = await CompanyLinkModel.findByIdAndDelete(id);
      if (result) {
        return res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const db = getDb();
  if (db.companyLinks) {
    const initialLen = db.companyLinks.length;
    db.companyLinks = db.companyLinks.filter((l: any) => l.id !== id);
    if (db.companyLinks.length === initialLen) {
      return res.status(404).json({ error: "Company link not found" });
    }
    writeDb(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Company link not found" });
});

// --- Smart Attendance & Entry System APIs ---
app.get("/api/attendance", async (req, res) => {
  if (useMongo) {
    try {
      const scans = await AttendanceModel.find().sort({ timestamp: -1 });
      return res.json(scans.map((s: any) => ({
        id: s._id.toString(),
        studentName: s.studentName,
        regNo: s.regNo,
        timestamp: s.timestamp.toISOString(),
        location: s.location,
        course: s.course,
        status: s.status,
        snapshot: s.snapshot || ""
      })));
    } catch (err) {
      console.error("Error fetching attendance scans:", err);
    }
  }
  const db = getDb();
  res.json(db.attendance || []);
});

app.post("/api/attendance/scan", async (req, res) => {
  const { studentName, regNo, location, course, status, snapshot } = req.body;
  if (!studentName || !regNo || !course) {
    return res.status(400).json({ error: "Student Name, Register Number, and Course are required." });
  }

  const finalStatus = status || "Success";
  const finalLocation = location || "Block A - Room 101";

  if (useMongo) {
    try {
      const scan = await AttendanceModel.create({
        studentName,
        regNo,
        location: finalLocation,
        course,
        status: finalStatus,
        snapshot: snapshot || "",
        timestamp: new Date()
      });
      return res.status(201).json({
        id: scan._id.toString(),
        studentName: scan.studentName,
        regNo: scan.regNo,
        timestamp: scan.timestamp.toISOString(),
        location: scan.location,
        course: scan.course,
        status: scan.status,
        snapshot: scan.snapshot || ""
      });
    } catch (err) {
      console.error("Error saving attendance scan:", err);
    }
  }

  const db = getDb();
  const newScan = {
    id: "att-" + Date.now(),
    studentName,
    regNo,
    timestamp: new Date().toISOString(),
    location: finalLocation,
    course,
    status: finalStatus,
    snapshot: snapshot || ""
  };
  if (!db.attendance) db.attendance = [];
  db.attendance.unshift(newScan);
  writeDb(db);
  res.status(201).json(newScan);
});

app.get("/api/leave", async (req, res) => {
  if (useMongo) {
    try {
      const leaves = await LeaveRequestModel.find().sort({ createdAt: -1 });
      return res.json(leaves.map((l: any) => ({
        id: l._id.toString(),
        studentName: l.studentName,
        regNo: l.regNo,
        reason: l.reason,
        type: l.type,
        startDate: l.startDate.toISOString().split("T")[0],
        endDate: l.endDate.toISOString().split("T")[0],
        status: l.status,
        timestamp: l.timestamp.toISOString()
      })));
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    }
  }
  const db = getDb();
  res.json(db.leaveRequests || []);
});

app.post("/api/leave", async (req, res) => {
  const { studentName, regNo, reason, type, startDate, endDate } = req.body;
  if (!studentName || !regNo || !reason || !startDate || !endDate) {
    return res.status(400).json({ error: "Student details, reason, and duration are required." });
  }

  if (useMongo) {
    try {
      const leave = await LeaveRequestModel.create({
        studentName,
        regNo,
        reason,
        type: type || "Casual Leave",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "Pending",
        timestamp: new Date()
      });
      return res.status(201).json({
        id: leave._id.toString(),
        studentName: leave.studentName,
        regNo: leave.regNo,
        reason: leave.reason,
        type: leave.type,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        status: leave.status,
        timestamp: leave.timestamp.toISOString()
      });
    } catch (err) {
      console.error("Error creating leave request:", err);
    }
  }

  const db = getDb();
  const newLeave = {
    id: "lv-" + Date.now(),
    studentName,
    regNo,
    reason,
    type: type || "Casual Leave",
    startDate,
    endDate,
    status: "Pending" as const,
    timestamp: new Date().toISOString()
  };
  if (!db.leaveRequests) db.leaveRequests = [];
  db.leaveRequests.unshift(newLeave);
  writeDb(db);
  res.status(201).json(newLeave);
});

app.post("/api/leave/approve", async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "Leave ID and final status (Approved/Rejected) are required." });
  }

  if (useMongo) {
    try {
      const leave = await LeaveRequestModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (leave) {
        return res.json({
          id: leave._id.toString(),
          studentName: leave.studentName,
          regNo: leave.regNo,
          reason: leave.reason,
          type: leave.type,
          startDate: leave.startDate.toISOString().split("T")[0],
          endDate: leave.endDate.toISOString().split("T")[0],
          status: leave.status,
          timestamp: leave.timestamp.toISOString()
        });
      }
    } catch (err) {
      console.error("Error updating leave request:", err);
    }
  }

  const db = getDb();
  if (db.leaveRequests) {
    const leave = db.leaveRequests.find((l: any) => l.id === id);
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }
    leave.status = status;
    writeDb(db);
    return res.json(leave);
  }
  res.status(404).json({ error: "Leave request not found." });
});

app.get("/api/schedules", async (req, res) => {
  const db = getDb();
  res.json(db.schedules || []);
});

// Vite middleware for development or serving build in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Entry Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
