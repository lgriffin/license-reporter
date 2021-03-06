'use strict';

const rewire = require('rewire');
const test = require('tape');
const path = require('path');
const stdout = require('test-console').stdout;
const stderr = require('test-console').stderr;
const unifiedList = require('../lib/unified-list.js');
const unifiedListJSON = require('../lib/resources/default-unified-list.json');
const rewired = rewire('../lib/unified-list.js');
const getLicensesFromXmlObject = rewired.__get__('getLicensesFromXmlObject');
const findApproved = rewired.__get__('findApproved');
const findNotApproved = rewired.__get__('findNotApproved');
const printApproved = rewired.__get__('printApproved');
const printNotApproved = rewired.__get__('printNotApproved');

const xmlObject = {
  dependencies: {
    dependency: [
      {
        packageName: 'testProject',
        version: '1.0.0',
        licenses: {
          license: [
            {name: 'MIT', url: '...'}
          ]
        }
      },
      {
        packageName: 'notApproved',
        version: '2.0.0',
        licenses: {
          license: [
            {name: '9wm License (Original)', url: '...'}
          ]
        }
      }
    ]
  }
};

test('Should get the licenses from xmlObject', (t) => {
  t.plan(3);
  const licenses = getLicensesFromXmlObject(xmlObject);
  t.equal(licenses.length, 2);
  t.equal(licenses[0].license, 'MIT');
  t.equal(licenses[1].license, '9wm License (Original)');
  t.end();
});

test('Should get approved only from xmlObject based on unified list', (t) => {
  t.plan(1);
  const licenses = getLicensesFromXmlObject(xmlObject);
  const approvedList = [];
  Object.keys(unifiedListJSON).forEach(key => {
    if (unifiedListJSON[key].approved === 'yes') {
      approvedList.push(unifiedListJSON[key]);
    }
  });
  const approved = findApproved(approvedList, licenses);
  t.equal(Array.from(approved)[0].license, 'MIT');
  t.end();
});

test('Should get not approved only from xmlObject based on unified list', (t) => {
  t.plan(1);
  const licenses = getLicensesFromXmlObject(xmlObject);
  const notApprovedList = [];
  Object.keys(unifiedListJSON).forEach(key => {
    if (unifiedListJSON[key].approved !== 'yes') {
      notApprovedList.push(unifiedListJSON[key]);
    }
  });
  const notApproved = findNotApproved(notApprovedList, licenses);
  t.equal(Array.from(notApproved)[0].license, '9wm License (Original)');
  t.end();
});

test('Should print approved licenses', (t) => {
  t.plan(1);
  const expected = ['========= APPROVED LICENSES        ==========\n',
    'name: testProject , version: 1.0.0 , licenses: MIT\n',
    '========= APPROVED LICENSES        ==========\n'];

  const licenses = getLicensesFromXmlObject(xmlObject);
  const approvedList = [];
  Object.keys(unifiedListJSON).forEach(key => {
    if (unifiedListJSON[key].approved === 'yes') {
      approvedList.push(unifiedListJSON[key]);
    }
  });
  const approved = findApproved(approvedList, licenses);
  const log = stdout.inspectSync(() => { printApproved(approved); });
  t.deepEqual(log, expected);
  t.end();
});

test('Should print not approved licenses', (t) => {
  t.plan(1);
  const expected = ['========= NOT APPROVED LICENSES    ==========\n',
    'name: notApproved , version: 2.0.0 , licenses: 9wm License (Original)\n',
    '========= NOT APPROVED LICENSES    ==========\n'];

  const licenses = getLicensesFromXmlObject(xmlObject);
  const notApprovedList = [];
  Object.keys(unifiedListJSON).forEach(key => {
    if (unifiedListJSON[key].approved !== 'yes') {
      notApprovedList.push(unifiedListJSON[key]);
    }
  });
  const notApproved = findNotApproved(notApprovedList, licenses);
  const log = stdout.inspectSync(() => { printNotApproved(notApproved); });
  t.deepEqual(log, expected);
  t.end();
});

test('Should print approved and not approved licenses', (t) => {
  t.plan(1);
  const expected = ['========= APPROVED LICENSES        ==========\n',
    'name: testProject , version: 1.0.0 , licenses: MIT\n',
    '========= APPROVED LICENSES        ==========\n',
    '========= NOT APPROVED LICENSES    ==========\n',
    'name: notApproved , version: 2.0.0 , licenses: 9wm License (Original)\n',
    '========= NOT APPROVED LICENSES    ==========\n'];
  const options = {unifiedList: path.join(__dirname, '../lib/resources/default-unified-list.json')};
  unifiedList.init(options);
  const log = stdout.inspectSync(() => {
    unifiedList.check(options, xmlObject);
  });
  t.deepEqual(log, expected);
  t.end();
});

test('Should return url for the specified license name', (t) => {
  t.plan(5);
  const options = {unifiedList: path.join(__dirname, '../lib/resources/default-unified-list.json')};
  unifiedList.init(options);
  t.equal(unifiedList.urlForName(options, '3dfx Glide License'),
      'http://www.users.on.net/~triforce/glidexp/COPYING.txt');
  t.equal(unifiedList.urlForName(options, '4Suite Copyright License'), '');
  t.equal(unifiedList.urlForName(options, 'UNKNOWN'), 'UNKNOWN');
  const result = unifiedList.urlForName(options, 'bogus');
  t.equal(result, 'UNKNOWN');
  const expected = ['No URL was found for [bogus]\n'];
  const log = stderr.inspectSync(() => unifiedList.urlForName(options, 'bogus'));
  t.deepEqual(log, expected);
  t.end();
});

test('urlForName should be able to handle comma separated names', (t) => {
  t.plan(1);
  const options = {unifiedList: path.join(__dirname, '../lib/resources/default-unified-list.json')};
  unifiedList.init(options);
  t.equal(unifiedList.urlForName(options, '3dfx Glide License, UNKNOWN'),
      'http://www.users.on.net/~triforce/glidexp/COPYING.txt, UNKNOWN');
  t.end();
});
