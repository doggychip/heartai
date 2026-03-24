import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'tracker.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (!_db) throw new Error('Database not initialized');
  return _db;
}

export function initDb() {
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date TEXT,
      avatar_color TEXT DEFAULT '#8b5cf6',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS child_goals (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      progress INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_schedule (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      activity TEXT NOT NULL,
      category TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_milestones (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      achieved_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_daily_log (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT,
      sleep_hours INTEGER,
      notes TEXT,
      highlights TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    -- Learning Stories: rich narrative moments of growth
    CREATE TABLE IF NOT EXISTS learning_stories (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      title TEXT NOT NULL,
      narrative TEXT NOT NULL,
      domains TEXT, -- JSON array: ["cognitive","social-emotional","creative",...]
      photo_url TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    -- Spark scores: development domain ratings over time
    CREATE TABLE IF NOT EXISTS spark_scores (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      date TEXT NOT NULL,
      cognitive INTEGER DEFAULT 0,
      language INTEGER DEFAULT 0,
      social_emotional INTEGER DEFAULT 0,
      physical INTEGER DEFAULT 0,
      creative INTEGER DEFAULT 0,
      independence INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    -- Weekly reflections
    CREATE TABLE IF NOT EXISTS weekly_reflections (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      proudest_moment TEXT,
      biggest_challenge TEXT,
      focus_next_week TEXT,
      parent_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // Seed milestone library (static reference data)
  const libCount = _db.prepare('SELECT COUNT(*) as c FROM milestone_library').get() as any;
  if (!libCount) {
    _db.exec(`
      CREATE TABLE IF NOT EXISTS milestone_library (
        id TEXT PRIMARY KEY,
        age_min INTEGER NOT NULL,
        age_max INTEGER NOT NULL,
        domain TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT
      );
    `);
    seedMilestoneLibrary(_db);
  }

  console.log('Database initialized at', DB_PATH);
}

function seedMilestoneLibrary(database: Database.Database) {
  const insert = database.prepare(
    'INSERT INTO milestone_library (id, age_min, age_max, domain, title, description) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const milestones = [
    // Age 2-3
    { ageMin: 2, ageMax: 3, domain: 'cognitive', title: 'Sorts shapes and colors', desc: 'Can group objects by shape or color' },
    { ageMin: 2, ageMax: 3, domain: 'cognitive', title: 'Completes 3-4 piece puzzles', desc: 'Puts together simple puzzles independently' },
    { ageMin: 2, ageMax: 3, domain: 'cognitive', title: 'Understands "two"', desc: 'Grasps the concept of two items' },
    { ageMin: 2, ageMax: 3, domain: 'language', title: 'Speaks in 2-3 word sentences', desc: 'Combines words to express ideas' },
    { ageMin: 2, ageMax: 3, domain: 'language', title: 'Names familiar objects', desc: 'Can identify and name everyday items' },
    { ageMin: 2, ageMax: 3, domain: 'language', title: 'Follows 2-step instructions', desc: '"Pick up the toy and put it on the table"' },
    { ageMin: 2, ageMax: 3, domain: 'social-emotional', title: 'Shows affection openly', desc: 'Hugs, kisses, or shows care for others' },
    { ageMin: 2, ageMax: 3, domain: 'social-emotional', title: 'Takes turns with help', desc: 'Beginning to understand sharing with guidance' },
    { ageMin: 2, ageMax: 3, domain: 'social-emotional', title: 'Shows a wide range of emotions', desc: 'Expresses happiness, sadness, frustration clearly' },
    { ageMin: 2, ageMax: 3, domain: 'physical', title: 'Runs and climbs well', desc: 'Moves confidently, climbs playground equipment' },
    { ageMin: 2, ageMax: 3, domain: 'physical', title: 'Kicks a ball forward', desc: 'Can kick a ball in an intended direction' },
    { ageMin: 2, ageMax: 3, domain: 'creative', title: 'Scribbles with crayons', desc: 'Makes marks on paper with purpose' },
    { ageMin: 2, ageMax: 3, domain: 'creative', title: 'Enjoys music and dancing', desc: 'Moves body to rhythm, sings fragments of songs' },
    { ageMin: 2, ageMax: 3, domain: 'independence', title: 'Feeds self with spoon', desc: 'Can eat independently with utensils' },
    { ageMin: 2, ageMax: 3, domain: 'independence', title: 'Helps with dressing', desc: 'Pulls up pants, puts arms through sleeves' },

    // Age 3-4
    { ageMin: 3, ageMax: 4, domain: 'cognitive', title: 'Counts to 10', desc: 'Can count objects up to 10' },
    { ageMin: 3, ageMax: 4, domain: 'cognitive', title: 'Understands "same" and "different"', desc: 'Can compare and contrast objects' },
    { ageMin: 3, ageMax: 4, domain: 'cognitive', title: 'Plays make-believe creatively', desc: 'Creates imaginary scenarios with dolls, figures, etc.' },
    { ageMin: 3, ageMax: 4, domain: 'language', title: 'Speaks in full sentences', desc: 'Uses 4-5 word sentences regularly' },
    { ageMin: 3, ageMax: 4, domain: 'language', title: 'Tells simple stories', desc: 'Can narrate what happened during the day' },
    { ageMin: 3, ageMax: 4, domain: 'language', title: 'Knows some basic rules of grammar', desc: 'Uses "he" and "she" correctly' },
    { ageMin: 3, ageMax: 4, domain: 'social-emotional', title: 'Plays cooperatively with others', desc: 'Engages in group play with shared goals' },
    { ageMin: 3, ageMax: 4, domain: 'social-emotional', title: 'Shows concern for a crying friend', desc: 'Beginning of empathy and compassion' },
    { ageMin: 3, ageMax: 4, domain: 'social-emotional', title: 'Expresses likes and interests', desc: 'Developing a sense of self and preferences' },
    { ageMin: 3, ageMax: 4, domain: 'physical', title: 'Pedals a tricycle', desc: 'Coordinates legs to ride a tricycle' },
    { ageMin: 3, ageMax: 4, domain: 'physical', title: 'Catches a bounced ball', desc: 'Hand-eye coordination for catching' },
    { ageMin: 3, ageMax: 4, domain: 'creative', title: 'Draws circles and lines with purpose', desc: 'Makes recognizable shapes intentionally' },
    { ageMin: 3, ageMax: 4, domain: 'creative', title: 'Builds towers of 6+ blocks', desc: 'Constructs with intention and some planning' },
    { ageMin: 3, ageMax: 4, domain: 'independence', title: 'Uses toilet independently', desc: 'Manages bathroom routine with minimal help' },
    { ageMin: 3, ageMax: 4, domain: 'independence', title: 'Washes and dries hands', desc: 'Completes hand washing routine alone' },

    // Age 4-5
    { ageMin: 4, ageMax: 5, domain: 'cognitive', title: 'Counts to 20', desc: 'Counts objects accurately to 20' },
    { ageMin: 4, ageMax: 5, domain: 'cognitive', title: 'Understands time concepts', desc: 'Grasps "yesterday", "today", "tomorrow"' },
    { ageMin: 4, ageMax: 5, domain: 'cognitive', title: 'Asks "why" and "how" questions', desc: 'Shows deep curiosity about how things work' },
    { ageMin: 4, ageMax: 5, domain: 'language', title: 'Tells longer stories', desc: 'Narratives have beginning, middle, and end' },
    { ageMin: 4, ageMax: 5, domain: 'language', title: 'Knows some letters and sounds', desc: 'Recognizes letters and their sounds' },
    { ageMin: 4, ageMax: 5, domain: 'language', title: 'Speaks clearly to strangers', desc: 'Can be understood by people outside the family' },
    { ageMin: 4, ageMax: 5, domain: 'social-emotional', title: 'Negotiates solutions to conflicts', desc: '"I\'ll go first, then you" without adult help' },
    { ageMin: 4, ageMax: 5, domain: 'social-emotional', title: 'Shows understanding of rules', desc: 'Follows game rules and household rules' },
    { ageMin: 4, ageMax: 5, domain: 'physical', title: 'Hops on one foot', desc: 'Balances and hops several times' },
    { ageMin: 4, ageMax: 5, domain: 'physical', title: 'Uses scissors', desc: 'Cuts along a line with child scissors' },
    { ageMin: 4, ageMax: 5, domain: 'creative', title: 'Draws a person with 2-4 body parts', desc: 'Recognizable human figure drawings' },
    { ageMin: 4, ageMax: 5, domain: 'creative', title: 'Makes up songs or dances', desc: 'Creates original creative expressions' },
    { ageMin: 4, ageMax: 5, domain: 'independence', title: 'Dresses and undresses independently', desc: 'Manages buttons, zippers with minimal help' },
    { ageMin: 4, ageMax: 5, domain: 'independence', title: 'Brushes teeth with supervision', desc: 'Handles toothbrush, needs help with thoroughness' },

    // Age 5-6
    { ageMin: 5, ageMax: 6, domain: 'cognitive', title: 'Writes own name', desc: 'Can write first name from memory' },
    { ageMin: 5, ageMax: 6, domain: 'cognitive', title: 'Understands basic addition', desc: 'Can add small numbers using objects or fingers' },
    { ageMin: 5, ageMax: 6, domain: 'cognitive', title: 'Sorts objects by multiple features', desc: 'Groups by color AND size simultaneously' },
    { ageMin: 5, ageMax: 6, domain: 'language', title: 'Recognizes rhyming words', desc: 'Identifies and creates rhymes' },
    { ageMin: 5, ageMax: 6, domain: 'language', title: 'Retells a story in order', desc: 'Remembers and sequences story events' },
    { ageMin: 5, ageMax: 6, domain: 'social-emotional', title: 'Shows desire to please friends', desc: 'Adjusts behavior to maintain friendships' },
    { ageMin: 5, ageMax: 6, domain: 'social-emotional', title: 'Understands "fair" and "unfair"', desc: 'Developing a sense of justice' },
    { ageMin: 5, ageMax: 6, domain: 'physical', title: 'Rides a bike with training wheels', desc: 'Pedals, steers, and balances on a bicycle' },
    { ageMin: 5, ageMax: 6, domain: 'physical', title: 'Ties a basic knot', desc: 'Beginning to learn shoe-tying' },
    { ageMin: 5, ageMax: 6, domain: 'creative', title: 'Draws recognizable scenes', desc: 'Creates pictures that tell a story' },
    { ageMin: 5, ageMax: 6, domain: 'independence', title: 'Prepares simple snacks', desc: 'Makes a sandwich, pours cereal and milk' },
    { ageMin: 5, ageMax: 6, domain: 'independence', title: 'Takes responsibility for belongings', desc: 'Puts away backpack, keeps track of things' },

    // Age 6-7
    { ageMin: 6, ageMax: 7, domain: 'cognitive', title: 'Reads simple books independently', desc: 'Decodes words and comprehends simple stories' },
    { ageMin: 6, ageMax: 7, domain: 'cognitive', title: 'Understands place value', desc: 'Knows ones, tens in numbers' },
    { ageMin: 6, ageMax: 7, domain: 'cognitive', title: 'Tells time to the hour', desc: 'Reads analog clock for full hours' },
    { ageMin: 6, ageMax: 7, domain: 'language', title: 'Writes simple sentences', desc: 'Composes original sentences with correct spelling' },
    { ageMin: 6, ageMax: 7, domain: 'language', title: 'Reads aloud with expression', desc: 'Uses tone and inflection when reading' },
    { ageMin: 6, ageMax: 7, domain: 'social-emotional', title: 'Handles frustration without meltdowns', desc: 'Uses words instead of tantrums most of the time' },
    { ageMin: 6, ageMax: 7, domain: 'social-emotional', title: 'Shows good sportsmanship', desc: 'Can win and lose gracefully' },
    { ageMin: 6, ageMax: 7, domain: 'physical', title: 'Rides a bike without training wheels', desc: 'Balances and pedals independently' },
    { ageMin: 6, ageMax: 7, domain: 'physical', title: 'Swims basic strokes', desc: 'Can swim short distances safely' },
    { ageMin: 6, ageMax: 7, domain: 'creative', title: 'Creates detailed artwork', desc: 'Drawings show perspective, detail, and planning' },
    { ageMin: 6, ageMax: 7, domain: 'creative', title: 'Plays a musical instrument basics', desc: 'Learning notes on piano, ukulele, etc.' },
    { ageMin: 6, ageMax: 7, domain: 'independence', title: 'Ties shoelaces', desc: 'Can tie and untie shoes independently' },
    { ageMin: 6, ageMax: 7, domain: 'independence', title: 'Manages morning routine', desc: 'Gets ready for school with minimal reminders' },

    // Age 7-8
    { ageMin: 7, ageMax: 8, domain: 'cognitive', title: 'Reads chapter books', desc: 'Sustains reading across multiple sittings' },
    { ageMin: 7, ageMax: 8, domain: 'cognitive', title: 'Understands multiplication concept', desc: 'Grasps repeated addition / groups of' },
    { ageMin: 7, ageMax: 8, domain: 'cognitive', title: 'Plans multi-step projects', desc: 'Can plan and execute a project with several steps' },
    { ageMin: 7, ageMax: 8, domain: 'language', title: 'Writes paragraphs', desc: 'Composes organized multi-sentence paragraphs' },
    { ageMin: 7, ageMax: 8, domain: 'language', title: 'Uses dictionary or reference tools', desc: 'Looks up words independently' },
    { ageMin: 7, ageMax: 8, domain: 'social-emotional', title: 'Develops close friendships', desc: 'Maintains deeper, more selective friendships' },
    { ageMin: 7, ageMax: 8, domain: 'social-emotional', title: 'Shows empathy in complex situations', desc: 'Understands others\' perspectives even when different from own' },
    { ageMin: 7, ageMax: 8, domain: 'physical', title: 'Participates in team sports', desc: 'Understands rules and plays a position' },
    { ageMin: 7, ageMax: 8, domain: 'creative', title: 'Writes original stories', desc: 'Creates fiction with characters, plot, and setting' },
    { ageMin: 7, ageMax: 8, domain: 'creative', title: 'Pursues a creative hobby', desc: 'Self-directed art, music, building, or craft projects' },
    { ageMin: 7, ageMax: 8, domain: 'independence', title: 'Makes own lunch', desc: 'Prepares a full meal independently' },
    { ageMin: 7, ageMax: 8, domain: 'independence', title: 'Manages homework independently', desc: 'Completes assignments without constant supervision' },

    // Age 8-10
    { ageMin: 8, ageMax: 10, domain: 'cognitive', title: 'Thinks abstractly', desc: 'Understands metaphors, hypotheticals, and "what if"' },
    { ageMin: 8, ageMax: 10, domain: 'cognitive', title: 'Researches topics independently', desc: 'Can find and evaluate information on a topic' },
    { ageMin: 8, ageMax: 10, domain: 'cognitive', title: 'Understands money and budgeting', desc: 'Grasps saving, spending, and value concepts' },
    { ageMin: 8, ageMax: 10, domain: 'language', title: 'Writes multi-paragraph essays', desc: 'Organizes thoughts into structured written pieces' },
    { ageMin: 8, ageMax: 10, domain: 'language', title: 'Debates and defends opinions', desc: 'Articulates reasoning and listens to counterpoints' },
    { ageMin: 8, ageMax: 10, domain: 'social-emotional', title: 'Navigates peer pressure', desc: 'Makes independent choices despite group influence' },
    { ageMin: 8, ageMax: 10, domain: 'social-emotional', title: 'Shows leadership qualities', desc: 'Takes initiative, organizes group activities' },
    { ageMin: 8, ageMax: 10, domain: 'social-emotional', title: 'Manages emotions independently', desc: 'Self-regulates without adult intervention most of the time' },
    { ageMin: 8, ageMax: 10, domain: 'physical', title: 'Excels in a physical discipline', desc: 'Shows skill development in a sport, dance, or martial art' },
    { ageMin: 8, ageMax: 10, domain: 'creative', title: 'Creates complex original works', desc: 'Detailed art, compositions, inventions, or stories' },
    { ageMin: 8, ageMax: 10, domain: 'creative', title: 'Performs for an audience', desc: 'Comfortable presenting, performing, or exhibiting work' },
    { ageMin: 8, ageMax: 10, domain: 'independence', title: 'Manages own schedule', desc: 'Tracks activities, homework, and commitments' },
    { ageMin: 8, ageMax: 10, domain: 'independence', title: 'Takes care of a pet or plant', desc: 'Sustained responsibility for another living thing' },
    { ageMin: 8, ageMax: 10, domain: 'independence', title: 'Handles money in real situations', desc: 'Buys items, counts change, saves toward goals' },
  ];

  const insertMany = database.transaction(() => {
    for (const m of milestones) {
      insert.run(crypto.randomUUID(), m.ageMin, m.ageMax, m.domain, m.title, m.desc || null);
    }
  });
  insertMany();
  console.log(`Seeded ${milestones.length} milestone library entries`);
}
