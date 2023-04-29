const express = require("express");
const app = express();

const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
app.use(express.json());
const initializerDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3003/");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializerDBAndServer();

//converting state table case
const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
// converting district table
const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
const reportConvertCase = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};
//get all states in state table
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT *
    FROM state
    ORDER BY state_id;`;
  const statesList = await db.all(getStatesQuery);
  const statesArray = statesList.map((each) => {
    return convertStateDbObjectToResponseObject(each);
  });

  response.send(statesArray);
});

//get state ApI
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  const stateResult = convertStateDbObjectToResponseObject(state);
  response.send(stateResult);
});

//post the district API
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
    INSERT INTO 
    district (district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const addDistrict = await db.run(postDistrictQuery);
  const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});
//get the district API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId}; `;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//del the district API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//update the district API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
            UPDATE
                district
            SET
            district_name = '${districtName}',
              state_id = ${stateId},
              cases = ${cases},
              cured = ${cured},
              active = ${active},
              deaths = ${deaths}
            WHERE
              district_id = ${districtId};`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//get the total cases API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateCaseReport = `
    SELECT SUM(cases) AS cases,
    SUM(cured) AS cured,
    SUM(active) AS active,
    SUM(deaths) AS deaths
    FROM district
    WHERE state_id = ${stateId};`;
  const stateReport = await db.get(stateCaseReport);
  response.send(reportConvertCase(stateReport));
});

//get state based on districtId API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
    SELECT state_name
    FROM state JOIN district
    ON state.state_id= district.state_id
    WHERE district.district_id = ${districtId};`;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
