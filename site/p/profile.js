  "use strict";

  // The example from forever-core's docs/profile-code-example.txt: Barry Buckfast, level 21 Hunter, Alliance.
  var EXAMPLE = "1.eyJuIjoiQmFycnkgQnVja2Zhc3QiLCJjIjoiSFVOVEVSIiwibCI6MjEsImYiOiJBbGxpYW5jZSIsInQiOjE3OTQ1MTYwNjAsInMiOnsiYWR2Ijp7InF1ZXN0X3R1cm5faW4iOjk2LCJxdWVzdF90dXJuX2lucyI6OTZ9LCJjb20iOnsiY29tbWlzc2lvbl90dXJuaW4iOjd9LCJmZ2QiOnsiYm9zc19maXJzdF9raWxsIjoyLCJib3NzX2ZpcnN0X3NpZ2h0aW5nIjo0LCJib3NzX2tpbGxzIjo0LCJib3NzX3NpZ2h0aW5ncyI6MjMsImJyb256ZV9maW5kcyI6MywiY3JlYXR1cmVfa2lsbHMiOjUxNywiZmlyc3RfYnJvbnplIjoyLCJmaXJzdF9nb2xkIjoxLCJmaXJzdF9raWxsIjozLCJmaXJzdF9zaGlueSI6MSwiZmlyc3Rfc2lnaHRpbmciOjYsImZpcnN0X3NpbHZlciI6MiwiZ29sZF9maW5kcyI6Miwic2hpbnlfZmluZHMiOjEsInNpbHZlcl9maW5kcyI6NX0sImxlZyI6eyJmbGlnaHRfcGF0aF9rbm93biI6MTh9LCJza2wiOnsicmVjaXBlc19vYnNlcnZlZF9sZWFybmVkIjo0Mn0sInNwZiI6eyJkaXN0YW5jZV95YXJkcyI6MTI4NDUwLCJmbGlnaHRzX3Rha2VuIjoyNywicG9ydGFsc191c2VkIjo2LCJyb3V0ZXNfY29tcGxldGVkIjozNCwidHJhbnNwb3J0c191c2VkIjoxOX19fQ";
  var VERSION = 1;

  // Each addon a code may carry, in the order the card shows them: its name and the icon the addons page already has.
  var ADDONS = {
    adv: { name: "Adventure Guide Forever", icon: "../icons/adventure-guide-forever.svg" },
    spf: { name: "Shortest Path Forever", icon: "../icons/shortest-path-forever.svg" },
    skl: { name: "SkillUp Forever", icon: "../icons/skillup-forever.svg" },
    leg: { name: "Legacy Forever", icon: "../icons/legacy-forever.svg" },
    com: { name: "Commissions Forever", icon: "../icons/commissions-forever.svg" },
    fgd: { name: "Field Guide Forever", icon: "../icons/field-guide-forever.svg" }
  };
  var ADDON_ORDER = ["adv", "spf", "skl", "leg", "com", "fgd"];

  // The labels and units for every stat key in forever-core's docs/profile-code.md. A key this table does not know
  // still draws: its label is made from the key and it has no unit, so a newer code degrades instead of breaking.
  var STATS = {
    adv: {
      // The per-quest rows sum to the aggregate, so the card shows the total once.
      quest_turn_in: { hidden: true },
      quest_turn_ins: { label: "Quests turned in", unit: "quests" }
    },
    spf: {
      distance_yards: { label: "Distance travelled", unit: "yards" },
      routes_completed: { label: "Journeys", unit: "journeys" },
      transports_used: { label: "Transports used", unit: "transports" },
      flights_taken: { label: "Flights taken", unit: "flights" },
      portals_used: { label: "Portals used", unit: "portals" }
    },
    skl: {
      recipes_observed_learned: { label: "Recipes learned", unit: "recipes" }
    },
    leg: {
      flight_path_known: { label: "Flight paths known", unit: "flight paths" }
    },
    com: {
      commission_turnin: { label: "Commissions turned in", unit: "commissions" }
    },
    fgd: {
      boss_first_kill: { label: "Boss first kills", unit: "bosses" },
      boss_first_sighting: { label: "Boss first sightings", unit: "bosses" },
      boss_kills: { label: "Boss kills", unit: "bosses" },
      boss_sightings: { label: "Boss sightings", unit: "bosses" },
      bronze_finds: { label: "Bronze finds", unit: "creatures" },
      creature_kills: { label: "Creatures killed", unit: "kills" },
      first_bronze: { label: "First bronze finds", unit: "creatures" },
      first_gold: { label: "First gold finds", unit: "creatures" },
      first_kill: { label: "First kills", unit: "creatures" },
      first_shiny: { label: "First shiny finds", unit: "creatures" },
      first_sighting: { label: "First sightings", unit: "creatures" },
      first_silver: { label: "First silver finds", unit: "creatures" },
      gold_finds: { label: "Gold finds", unit: "creatures" },
      shiny_finds: { label: "Shiny finds", unit: "creatures" },
      silver_finds: { label: "Silver finds", unit: "creatures" }
    }
  };

  var CLASSES = {
    DEATHKNIGHT: "Death Knight",
    DEMONHUNTER: "Demon Hunter",
    DRUID: "Druid",
    EVOKER: "Evoker",
    HUNTER: "Hunter",
    MAGE: "Mage",
    MONK: "Monk",
    PALADIN: "Paladin",
    PRIEST: "Priest",
    ROGUE: "Rogue",
    SHAMAN: "Shaman",
    WARLOCK: "Warlock",
    WARRIOR: "Warrior"
  };

  var FACTION_CLASSES = { Alliance: "alliance", Horde: "horde", Neutral: "neutral" };

  var number = new Intl.NumberFormat("en-GB");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function humanise(key) {
    var words = String(key).replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  // Version, dot, base64url, then UTF-8 JSON (docs/profile-code.md). An unknown version is refused by name rather
  // than read as if it were this one.
  function decode(code) {
    var match = /^(\d+)\.([A-Za-z0-9_-]+)$/.exec(code);
    if (!match) throw { kind: "shape" };
    if (Number(match[1]) !== VERSION) throw { kind: "version", version: match[1] };
    var base64 = match[2].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    var text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  }

  function isRecord(record) {
    return record !== null && typeof record === "object" &&
      typeof record.n === "string" &&
      typeof record.c === "string" &&
      typeof record.l === "number" &&
      typeof record.f === "string" &&
      typeof record.t === "number" &&
      record.s !== null && typeof record.s === "object";
  }

  function madeDate(unix) {
    var date = new Date(unix * 1000);
    if (!unix || isNaN(date.getTime())) return "";
    return "Made " + date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  // A section's metrics in the docs' order, then any key a newer code added, alphabetical.
  function metricsFor(addonKey, stats) {
    var known = STATS[addonKey] || {};
    var keys = [];
    Object.keys(known).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(stats, key)) keys.push(key);
    });
    Object.keys(stats).sort().forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(known, key)) keys.push(key);
    });
    return keys;
  }

  function drawGroup(addonKey, stats) {
    var spec = STATS[addonKey] || {};
    var rows = [];
    metricsFor(addonKey, stats).forEach(function (key) {
      var value = stats[key];
      var detail = spec[key] || {};
      // Zero is what an addon reports for a metric this character has not touched: it stays in the code and out of
      // the card, so the card is progress rather than a checklist of blanks.
      if (detail.hidden || typeof value !== "number" || value <= 0) return;
      var row = el("div", "stat");
      row.appendChild(el("dt", null, detail.label || humanise(key)));
      var cell = el("dd", null, number.format(value));
      if (detail.unit) cell.appendChild(el("span", "unit", detail.unit));
      row.appendChild(cell);
      rows.push(row);
    });
    if (!rows.length) return null;
    var addon = ADDONS[addonKey] || { name: humanise(addonKey), icon: "" };
    var group = el("section", "group");
    var head = el("div", "group-head");
    if (addon.icon) {
      var icon = el("img");
      icon.src = addon.icon;
      icon.alt = "";
      icon.width = 30;
      icon.height = 30;
      head.appendChild(icon);
    }
    head.appendChild(el("h2", null, addon.name));
    group.appendChild(head);
    var list = el("dl", "stats");
    rows.forEach(function (row) {
      list.appendChild(row);
    });
    group.appendChild(list);
    return group;
  }

  function show(id) {
    ["empty", "card", "error"].forEach(function (name) {
      document.getElementById(name).hidden = name !== id;
    });
  }

  function render(record) {
    show("card");
    document.getElementById("name").textContent = record.n || "A Forever character";
    document.getElementById("level").textContent = record.l > 0 ? "Level " + number.format(record.l) : "";
    document.getElementById("class").textContent = CLASSES[record.c] || humanise(String(record.c).toLowerCase());
    var faction = document.getElementById("faction");
    faction.textContent = record.f;
    faction.className = "faction " + (FACTION_CLASSES[record.f] || "");
    document.getElementById("made").textContent = madeDate(record.t);

    var sections = document.getElementById("sections");
    sections.textContent = "";
    sections.hidden = false;
    ADDON_ORDER.forEach(function (key) {
      var stats = record.s[key];
      if (stats === null || typeof stats !== "object") return;
      var group = drawGroup(key, stats);
      if (group) sections.appendChild(group);
    });
    if (!sections.children.length) sections.hidden = true;
    document.getElementById("nothing").hidden = sections.children.length > 0;
    document.title = (record.n || "A Forever character") + " - Forever profile";
  }

  function fail(error) {
    show("error");
    var detail = document.getElementById("error-detail");
    if (error && error.kind === "version") {
      detail.textContent = "This page reads version " + VERSION + " codes, and this link holds version " +
        error.version + ". A newer page can read it.";
    } else if (error && error.kind === "shape") {
      detail.textContent = "The part after the # is not shaped like a Forever profile code. Check that the whole " +
        "link was copied.";
    } else {
      detail.textContent = "The code after the # could not be decoded. Check that the whole link was copied, or " +
        "make a fresh one with /forever profile in game.";
    }
    document.title = "Forever profile";
  }

  function route() {
    var code = window.location.hash.replace(/^#/, "");
    if (!code) {
      show("empty");
      document.title = "Forever profile";
      return;
    }
    try {
      var record = decode(code);
      if (!isRecord(record)) {
        fail({ kind: "shape" });
        return;
      }
      render(record);
    } catch (error) {
      fail(error);
    }
  }

  document.getElementById("example").href = "#" + EXAMPLE;
  document.getElementById("error-example").href = "#" + EXAMPLE;
  window.addEventListener("hashchange", route);
  route();
