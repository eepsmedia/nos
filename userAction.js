/*
==========================================================================

 * Created by tim on 8/24/18.
 
 
 ==========================================================================
userAction in nos2

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

nos2.userAction = {

    makeOrJoinWorld: async function (iMake, iInCode, iCallback = null) {
        let tWorldCode = iInCode;

        if (iMake) {
            //  get a world code
            const currentGameCount = await fireConnect.getWorldCount();
            console.log("   game count: " + currentGameCount);
            tWorldCode = eepsWords.newGameCode(currentGameCount);
            console.log("new code: " + tWorldCode);
        }

        if (tWorldCode) {
            const testDR = fireConnect.worldsCR.doc(tWorldCode);
            const testSnap = await testDR.get();

            if (iMake) {
                //      we are making a new world.
                if (testSnap.exists) {
                    alert(`World ${tWorldCode} already exists. Get a different name.`);
                    document.getElementById("worldCodeBox").value = "";
                    tWorldCode = null;
                } else {
                    //  new name, OK to make a world
                    await this.newWorld(tWorldCode, document.getElementById("worldNicknameBox").value);
                    await this.joinWorldByCode(tWorldCode, iCallback);
                    Swal.fire({
                        icon : "success",
                        text: `Success! The code for your new game is "${tWorldCode}". 
                                Players will need that code to log in.`});
                }
            } else {
                //      we are joining an exisiting world
                if (testSnap.exists) {
                    //  existing world, OK to join
                    await this.joinWorldByCode(tWorldCode, iCallback);
                } else {
                    Swal.fire({
                        icon : 'error',
                        text : `World ${tWorldCode} does not exist. Find an existing world.`
                })
                    document.getElementById("worldCodeBox").value = "";
                    tWorldCode = null;
                }
            }
            nos2.ui.update();
            return tWorldCode;
        } else {
            Swal.fire({
                icon : 'error',
                text: "you need to enter a world code somehow, like in the box.",
            });
        }
    },

    /**
     * @param iCode
     */
    joinWorldByCode: async function (iCode, iCallback = null) {
        const tWorldData = await fireConnect.joinWorld(iCode);
        nos2.state.worldCode = iCode;
        nos2.epoch = tWorldData.epoch;
        nos2.writerPhase = nos2.constants.kWriterPhaseNoTeam;
        nos2.editorPhase = nos2.constants.kEditorPhasePlaying;
        nos2.adminPhase = nos2.constants.kAdminPhasePlaying;

        nos2.journalName = tWorldData.jName;
        nos2.journal.initialize(nos2.journalName);

        if (iCallback) {
            iCallback(tWorldData);
        }
    },

    newWorld: async function (tWorldCode, tNickname) {

        //  OK, got it...
        const tJournalName = document.getElementById("journalNameBox").value;
        const tEpoch = document.getElementById("epochBox").value;
        const tScenario = document.getElementById("worldScenarioMenu").value;

        const tTheTruthOfThisScenario = univ.model.getNewStateTemp();
        const tGameState = {truth: tTheTruthOfThisScenario};    //  temp!

        const theWorldData = await fireConnect.makeNewWorld({
            "god": nos2.currentUser.uid,
            "code": tWorldCode,
            "nickname" : tNickname,
            "epoch": Number(tEpoch),
            'jName': tJournalName,
            'scen': tScenario,
            'state': JSON.stringify(tGameState),
            'created' : new Date(),
            'latest' : new Date()
        });

        return theWorldData;
    },

    newYear : function() {
        nos2.epoch++;
        const income = 1000 * Number(document.getElementById("annualIncomeThou").value);

        //  todo: bundle?

        Object.keys(nos2.theTeams).forEach( k => {
            fireConnect.adjustBalance(k, income);
        });

        fireConnect.thisWorldDR.update({epoch : nos2.epoch});
    },

    newTeam: async function () {
        const tTeam = {
            teamCode:   document.getElementById("newTeamCodeBox").value,
            teamName:   document.getElementById("newTeamNameBox").value,
            balance:    univ.constants.kInitialBalance,
            known :     [],
        };

        await fireConnect.addTeam(tTeam);
        this.suggestTeam();
        await nos2.ui.update();
    },

    suggestTeam: function () {
        const tCodeBox = document.getElementById("newTeamCodeBox");
        const tNameBox = document.getElementById("newTeamNameBox");
        const suggestionType = $('input[name=teamNameType]:checked').val();


        const tList = teamNameSuggestionList[suggestionType];
        const tIndex = nos2.nextTeamIndex % tList.length;
        nos2.nextTeamIndex = tIndex + 1;
        const tTeam = tList[tIndex];

        tCodeBox.value = tTeam.code;
        tNameBox.value = tTeam.name;
    },

    joinTeamByTeamCode: async function (iTeamCode, iTeamName) {
        nos2.state.teamCode = iTeamCode;
        nos2.state.teamName = iTeamName;
        nos2.writerPhase = nos2.constants.kWriterPhasePlaying;
        nos2.currentPaper = null;

        fireConnect.rememberTeamDocumentReference(nos2.state.teamCode);

        nos2.ui.update();
    },

    /**
     * User has chosen a figure from a menu while editing a paper.
     * In this version, the user can have only one.
     *
     * The idea is, they have to assemble the figure they want in their scenario (in CODAP)
     * before heading here to write the paper.
     */
    chooseOneFigure: function (theMenu) {
        let figureDBID = (theMenu.value);
        if (figureDBID) {
            nos2.currentFigure = nos2.theFigures[figureDBID];
            if (nos2.currentPaper) {
                if (nos2.currentPaper.isEditable()) {
                    nos2.currentPaper.setThisFigure( figureDBID );   //  the value in the Paper is just the dbid
                }
            }
        } else {
            nos2.currentFigure = null;
            nos2.currentPaper.removeAllFigures();
        }

        nos2.ui.update();
    },

    assignFigureToCurrentPaper: function () {
        nos2.currentPaper.setThisFigure(nos2.currentFigure);
    },


    makeFigurePreview: async function () {
        const tFigureID = nos2.currentFigure.guts.dbid;

        let thePreviewHTML = "<svg>";
        if (nos2.currentFigure) {
            thePreviewHTML = `<svg>${nos2.currentFigure.guts.image.contents}</svg>`;
        } else {
            thePreviewHTML = "<p>No figure specified.</p>";
        }

        document.getElementById("figurePreview").innerHTML = thePreviewHTML;

        //  nos2.currentFigure.displayImageIn("figurePreview");
        $("#figurePreview").dialog("open");
    },

    discardPaper: async function () {
        if (nos2.currentPaper) fireConnect.deletePaperByDBID(nos2.currentPaper.guts.dbid);
        nos2.currentPaper = null;
        await nos2.ui.update();
    },

    savePaper: async function () {
        if (!nos2.currentPaper) {
            alert("Somehow there is no Current Paper when we try to save!");
            nos2.currentPaper = new Paper();
        }

        const theDBID = nos2.currentPaper.save();

        await nos2.ui.update();
    },

    /**
     * called in writer
     */
    newPaper : function() {
        nos2.currentPaper = new Paper();
        nos2.ui.fillWritingFieldsWithPaper(nos2.currentPaper);
        nos2.currentFigure = null;
        nos2.goToTabNumber(1);   //  the second tab; also causes update
    },

    /**
     * Called when the user presses as edit button in the paper list
     *
     * Fills spaces in the UI with paper contents, author names, etc.
     *
     * @param iPaperID
     */
    openPaper :  function( iPaperID) {
        nos2.currentPaper = nos2.thePapers[iPaperID];    //  thePapers is a keyed object, not an array

        //  set the current figure to the first (if any) in this paper.
        const currentFigureDBID = nos2.currentPaper.guts.figures.length ? nos2.currentPaper.guts.figures[0] : null;
        nos2.currentFigure = currentFigureDBID ? nos2.theFigures[currentFigureDBID] : null;
        nos2.ui.fillWritingFieldsWithPaper(nos2.currentPaper);
        nos2.goToTabNumber(1);   //  the second tab; also causes update
    },

    viewPaper : function(iPaperID, iInJournal) {
        nos2.currentPaper = nos2.thePapers[iPaperID];    //  thePapers is a keyed object, not an array

        //  set the current figure to the first (if any) in this paper.
        const currentFigureDBID = nos2.currentPaper.guts.figures.length ? nos2.currentPaper.guts.figures[0] : null;
        nos2.currentFigure = currentFigureDBID ? nos2.theFigures[currentFigureDBID] : null;

        nos2.goToTabNumber(1);   //  the second tab; also causes update

    },


    submitPaper: async function () {
        //  what will the new status be?
        nos2.currentPaper.submit();

        await nos2.userAction.sendMessageFrom("author");  //  also blanks the text box

        nos2.currentFigure = null;
        nos2.currentPaper = null;

        nos2.goToTabNumber(0);   //  return to the list and update UI
    },


    judgePaper: async function ( ) {
        const tRawJudgment = document.querySelector("input[name='reviewChoice']:checked").value;
        const judgmentTranslator = {
            "accept" : nos2.constants.kPaperStatusPublished,
            "revise" : nos2.constants.kPaperStatusRevise,
            "reject" : nos2.constants.kPaperStatusRejected,
        }
        const tJudgment = judgmentTranslator[tRawJudgment];

        let tAuthorMessage = "";

        switch (tJudgment) {
            case nos2.constants.kPaperStatusPublished:
                nos2.currentPaper.publish();        //  sets many consequences
                tAuthorMessage = `${nos2.journal.name} is pleased to publish your paper, 
                    "${nos2.currentPaper.guts.title}."`;
                break;
            case nos2.constants.kPaperStatusRevise:
                tAuthorMessage = `We at ${nos2.journal.name} are very interested in your paper, 
                    "${nos2.currentPaper.guts.title}," but ask for revisions.`;
                break;
            case nos2.constants.kPaperStatusRejected:
                tAuthorMessage = `We are sorry, but your paper, 
                    "${nos2.currentPaper.guts.title}," does not meet our needs at this time.`;
                break;

        }
        nos2.currentPaper.guts.status = tJudgment;

        //  update the paper (with its new status) in the DB
        await fireConnect.savePaperToDB(nos2.currentPaper);

        await nos2.userAction.sendMessageFrom("reviewer");  //  also blanks the text box

        nos2.currentFigure = null;
        nos2.currentPaper = null;
        nos2.goToTabNumber(0);   //  return to the list, refresh
    },

    sendMessageFrom: async function (iSender) {
        const theTextBox = document.getElementById("message-text");
        const theNewMessage = theTextBox.value;
        if (theNewMessage) {
            fireConnect.saveMessage(nos2.currentPaper, iSender, theNewMessage);
            theTextBox.value = "";
        } else {
            //  alert("Enter text in the box to send a message to the authors");
        }
        nos2.ui.update();
    },


    giveGrant: async function(iTeamCode) {
        const theAmount = nos2.getGrantAmount();
        fireConnect.adjustBalance(iTeamCode, theAmount);
    },

    userSignOut : async function() {

    },

    userSignIn: async function (iFirebaseUser, iIsGod) {

        nos2.currentUser = iFirebaseUser;    //  not yet stored in db

        const tUserData = await fireConnect.setUserData(iFirebaseUser);

        if (iFirebaseUser) {
            nos2.adminPhase = nos2.constants.kAdminPhaseNoWorld;
            nos2.ui.update();
        }
    }

};