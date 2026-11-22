# Firebase analytics write rules

The checked-in database rules did not define access for the analytics nodes used by the portal. Firebase therefore rejected both canonical and legacy media-download counter transactions.

The added rules allow anonymous Firebase sessions to read aggregate analytics and increment only the PDF and media counters by exactly one. Initial canonical values can only be seeded from the existing legacy aggregate values. The recent action log remains restricted to the two administrator accounts. Existing Drive, Gallery, Hub, and Field Officer rules are unchanged.

`firebase.json` points the Firebase CLI at the complete `database.rules.json` file. Publish the database rules separately from the web deployment after review; a Vercel deploy does not apply Firebase rules.

