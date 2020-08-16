const sqliteParser = require("sqlite-parser");

describe("sql pretty", () => {
	it("sql", (done) => {
		sqliteParser(
			`CREATE TABLE "s" (
			\`id\` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
			"schID" integer NOT NULL,
			"cID" integer NOT NULL,
			"name" varchar(32) DEFAULT '',
			CONSTRAINT "s__schID_cID" FOREIGN KEY ("schID","cID") REFERENCES "c" ("schID","cID")
		);`,
			function (err, ast) {
				console.log(err, ast);
				done();
			}
		);
	});
});
