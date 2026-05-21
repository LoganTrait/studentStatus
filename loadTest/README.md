# Student Status Playwright Load Test

This load test drives the uses the app via a chromium browser context
It creates one teacher dashboard and many student clients. Each student joins the same room and changes status through the UI.

## Run baseline

set APP_URL=PUT_LINK_HERE
set SCENARIO_NAME=baselinetest
set STUDENTS=30
set DURATION_SECONDS=600
set JOIN_BATCH_SIZE=5
npm run load:playwright


## Run peak classroom test (2x baseline)

set APP_URL=PUT_LINK_HERE
set SCENARIO_NAME=peaktest
set STUDENTS=60
set DURATION_SECONDS=600
set JOIN_BATCH_SIZE=5
npm run load:playwright

## Run stress test

set APP_URL=PUT_LINK_HERE
set SCENARIO_NAME=stresstest
set STUDENTS=100
set DURATION_SECONDS=600
set JOIN_BATCH_SIZE=10
npm run load:playwright

## Run spike test

set APP_URL=PUT_LINK_HERE
set SCENARIO_NAME=spiketest
set STUDENTS=60
set DURATION_SECONDS=120
set MIN_THINK_TIME_MS=1000
set MAX_THINK_TIME_MS=3000
set JOIN_BATCH_SIZE=10
npm run load:playwright


## Run more realistic test 

set APP_URL=PUT_LINK_HERE
set SCENARIO_NAME=realistictest
set STUDENTS=30
set DURATION_SECONDS=600
set MIN_THINK_TIME_MS=240000
set MAX_THINK_TIME_MS=360000
set JOIN_BATCH_SIZE=5
npm run load:playwright


## Output

Each run outputs

summary.json - main thesis metrics
actions.csv - per action data for graphs and analysis
actions.json - detailed per action data
teacher-events.json - teacher listener/render events
student-events.json - student client events
browser-errors.json - browser errors

## metrics

click to Firestore write commit
Firestore commit to teacher snapshot received
Firestore commit to teacher rendered update
total student click to teacher rendered update
success rate
failed action count
browser error count
estimated document writes
actions per minute
