/*
==========================================================================

 * Created by tim on 8/24/18.
 
 
 ==========================================================================
nos2 in nos2

Author:   Tim Erickson

Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==========================================================================

*/

/*
Implementation notes

nos.currentFigure   is a Figure, but it is NOT a pointer into an element in nos2.theFigures.
                    It's purely local and temporary, and only gets sent to the DB when you save the figure.
                    Likewise, when the DB tells us figures have changed, it does not change!
                    The old bug (2020-09-02): It was updated only `onblur`. When the DB told us something
                    changed, we updated nos.currentFigure (even though it did not come from the DB).
                    Because it had not been updated since the last blur, current work was lost.
                    Now it's updated with a textbox `oninput` handler, that is, at every keypress.
 */

let nos2 = {


    initialize: async function(iApp) {
        this.app = iApp;
        console.log(`Initialize with iApp = ${iApp}`);
        try {
            await fireConnect.initialize();
            nos2.clearVariableValues();
            nos2.ui.initialize();    //  whichever UI it is!
            nos2.ui.update();
        } catch(e) {
            console.log(e.message);
        }

    },

    app: null,

    currentUser : null,

    state: {},
    epoch: 2022,        //  the time.  Not saved because it will be in the DB
    currentPaper: null,
    currentFigure: null, //  the actual Figure currently being displayed/edited: nos2.currentFigure

    myGodID: null,
    myGodName: null,
    adminPhase: null,
    writerPhase: null,
    editorPhase: null,
    nextTeamIndex: Math.floor(Math.random() * 100),

    journalName: "",

    //  local copies of data stored on DB (FireStore). So not part of state.

    theWorld : {},
    theTeams: {},      //  keys will be team IDs, which are teamCodes
    thePapers: {},     //  keys will be paper IDs
    theFigures: {},     //  keys are figure dbids
    theResults: {},     //  likewise

    constants: {
        version: "2024a",

        kAdminPhaseNoGod: 1,
        kAdminPhaseNoWorld: 2,
        kAdminPhasePlaying: 49,

        kWriterPhaseNoWorld: 51,
        kWriterPhaseNoTeam: 52,
        kWriterPhasePlaying: 89,

        kPaperStatusDraft: 'draft',
        kPaperStatusSubmitted: 'submitted',
        kPaperStatusRejected: 'rejected',
        kPaperStatusRevise: 'revise',
        kPaperStatusReSubmitted: 'resubmitted',
        kPaperStatusPublished: 'published',

        kEditorPhaseNoWorld: 101,
        kEditorPhasePlaying: 199,

        kTrashCan: "\uD83D\uddd1",
    },

    freshState : function() {
        return {
            worldCode: null,
            teamCode: null,      //  the "team" we are in (the ID)
            teamName: null,    //  full name of the team
        }
    },

    clearVariableValues: function() {
        this.myGodID = null;
        this.myGodName = null;
        nos2.adminPhase = nos2.constants.kAdminPhaseNoGod;
        nos2.writerPhase = nos2.constants.kWriterPhaseNoWorld;
        nos2.editorPhase = nos2.constants.kEditorPhaseNoWorld;

        nos2.journalName = "";

        nos2.state = nos2.freshState();     //  teamCode, teamName, worldCode

        nos2.theWorld = {};
        nos2.theTeams = {};
        nos2.thePapers = {};
        nos2.theFigures = {};
        nos2.theResults = {};

        nos2.currentPaper = null;
        nos2.currentFigure = null;

        const theWorldCodeBox = document.getElementById("worldCodeBox");
        if (theWorldCodeBox) theWorldCodeBox.value = "";
    },

    logout: function () {
        this.clearVariableValues();

        fireConnect.unsubscribeFromFigures();
        fireConnect.unsubscribeFromPapers();
        fireConnect.unsubscribeFromResults();
        fireConnect.unsubscribeFromTeams();
        fireConnect.unsubscribeFromWorld();
        
        nos2.ui.update();
    },

    goToTabNumber: function (iTab) {
        $("#tabs").tabs("option", "active", iTab);
        nos2.ui.update();
    },


    restoreTeamsFiguresPapersResults: async function (iWorldCode) {
        nos2.theWorld = await fireConnect.getWorldData(iWorldCode);
        nos2.theTeams = await fireConnect.getAllTeams(iWorldCode);
        nos2.thePapers = await fireConnect.getAllPapers();
        nos2.theFigures = await fireConnect.getAllFigures();
        nos2.theResults = await fireConnect.getAllResults();

        //  [nos2.theTeams, nos2.thePapers, nos2.theFigures] = await Promise.all([tPromise, pPromise, fPromise]);
    },


    getKnownResults: async function () {
        if (nos2.state.worldCode && nos2.state.teamCode) {
            let resultsOut = [];
            const myTeam = nos2.theTeams[nos2.state.teamCode];
            const theKnownResultIDs = myTeam.known;

            theKnownResultIDs.forEach( krid => {
                resultsOut.push(nos2.theResults[krid]);
            });

            return resultsOut;      //   and array of Results
        } else {
            return [];
        }
    },

    constructConvoHTML: function (iPaper) {

        let out = "";

        if (iPaper) {
            const C = iPaper.guts.convo;

            if (C.length) {
                out = "<table>";
                C.forEach(mess => {
                    out += `<tr><td>${mess.sender}:</td><td>${mess.message}</td></tr>`;
                });
                out += "</table>";
                return out;
            } else {
                out = "No messages have been exchanged about this paper.";
            }
        }

        return out;
    },

    getGrantAmount : function() {
        return 1000 * Number(document.getElementById("grantAmountThou").value)
    }

};