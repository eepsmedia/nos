/*
==========================================================================

 * Created by tim on 8/24/18.
 
 
 ==========================================================================
DBconnect in nos2

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

fireAuth = {

    auth : null,    //  shortcut set in initialize()

    UI : null,      //  the firebaseUI object, for authentication

    initialize: async function() {
        firebase.auth().signOut();
        nos2.currentUser = null;

        const txtDisplayName = document.getElementById("loginDisplayNameText");
        const txtEmail = document.getElementById("loginEmailText");
        const txtPassword = document.getElementById("loginPasswordText");

        const btnLogin = document.getElementById("loginButton");
        const btnSignup = document.getElementById("signUpButton");
        const btnLogout = document.getElementById("logoutButton");

        btnLogin.addEventListener("click", async e => {
            const auth = firebase.auth();

            try {
                const loginResult = await auth.signInWithEmailAndPassword(
                    txtEmail.value,
                    txtPassword.value
                );
                const oldDisplayName = loginResult.user.displayName;

                if (txtDisplayName.value) {
                    const updateResult = await auth.currentUser.updateProfile({
                        displayName: txtDisplayName.value,
                    });
                }
                console.log(`login button! Logging in [${auth.currentUser.displayName}]`);
                nos2.userAction.userSignIn(auth.currentUser);   //  OUR sign-in, not firebase's.
                Swal.fire({
                    icon: 'info',
                    title: 'Welcome back!',
                    text: `Good to see you, ${auth.currentUser.displayName}`,
                });


            } catch(e) {
                console.log(e.message);
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: e.message,
                });
            }
        });

        btnSignup.addEventListener("click", async e => {
            const auth = firebase.auth();
            if (txtDisplayName.value) {

                try {
                    const loginResult = await auth.createUserWithEmailAndPassword(
                        txtEmail.value,
                        txtPassword.value
                    );
                    updateResult = await auth.currentUser.updateProfile({
                        displayName: txtDisplayName.value,
                    });
                    console.log(auth.currentUser);
                    nos2.userAction.userSignIn(auth.currentUser);

                } catch (e) {
                    console.log(e.message);
                    Swal.fire({
                        icon: 'error',
                        title: 'oops!',
                        text: `Problems signing up: ${e.message}`,
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: "You really should have a display name in order to be a world administrator.",
                });
            }
        });

        btnLogout.addEventListener('click', e => {
            firebase.auth().signOut();
            nos2.currentUser = null;
            nos2.ui.update();
        })

        //  realtime listener for authentication changes, e.g., log in, log out
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log(`The authorization change listener detected a change in [${user.displayName}]`);
            } else {
                console.log("not logged ih");
            }
        });
    }
}

fireConnect = {

    db: null,
    /**
     * Collection Reference to the "worlds" database
     */
    worldsCR: null,
    godsCR: null,
    teamsCR: null,         //  teams SUBcollection within this world.
    resultsCR: null,
    figuresCR: null,
    papersCR: null,
    thisWorldDR: null,     //  THIS world's document reference
    myTeamDR: null,

    unsubscribeFromPapers: null,
    unsubscribeFromFigures: null,
    unsubscribeFromTeams: null,


    initialize: async function () {
        await firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();
        this.worldsCR = this.db.collection("worlds");     //  worlds collection reference
        this.godsCR = this.db.collection("gods");

        if (nos2.app === "admin") {         //  todo: set up authorization for other roles
            await fireAuth.initialize();
        }

        //  testing firestore syntax...

        /*
                        const newDoc = this.db.collection("tests").add(
                            {foo: 42, bar: [13, 43], baz: {foo: 12, bar: 45}}
                        );
        */

        /*
                let testContents = {foo: 42, bar: [13, 43], baz: {alpha: 12, beta: 45}};
                this.db.collection("tests").doc("aTest").set(testContents);
        */

        /*
                        testContents["now"] = new Date();

                        const newDocRef = this.db.collection("tests").doc();
                        this.db.collection("tests").doc(newDocRef.id).set(testContents);
        */

        /*
                this.db.collection("tests").doc("aTest").update(
                    {
                        bar: firebase.firestore.FieldValue.arrayUnion(...[13, 14, 15]),
                    }
                )
        */

    },

    rememberTeamDocumentReference(iTeamCode) {
        this.myTeamDR = fireConnect.thisWorldDR.collection("teams").doc(iTeamCode);
    },

    adjustBalance(iTeamCode, iAmount) {
        nos2.theTeams[iTeamCode].balance += iAmount;
        fireConnect.teamsCR.doc(iTeamCode).update({
            balance: nos2.theTeams[iTeamCode].balance,
            lastChange: Date.now(),
        });
    },

    async assertKnownResult(iID) {
        //  save in the known array of the TEAM
        const thisTeam = nos2.theTeams[nos2.state.teamCode];

        if (!Array.isArray(iID)) {
            iID = [iID]
        }

        //  add to array, avoiding duplicates (Array Union)
        iID.forEach(id => {
            if (!thisTeam.known.includes(id)) {
                thisTeam.known.push(id);
            }
        });

        await this.myTeamDR.update({
            known: thisTeam.known,
            lastChange: Date.now(),
        });

        let tAlertText;

        if (iID.length === 1) {
            tAlertText = `You just learned a new result`;
        } else {
            tAlertText = `You just learned ${iID.length} new results`;
        }

        Swal.fire({
            icon: 'info',
            title: 'New data',
            text: tAlertText,
        });

        console.log(`Team ${thisTeam.teamCode} now knows ${thisTeam.known.length} results ${thisTeam.known.toString()}`);
    },

    getWorldCount: async function () {
        const gamesQuerySnapshot = await this.worldsCR.get();
        return gamesQuerySnapshot.size;
    },

    makeNewWorld: async function (iNewWorldObject) {
        try {
            //  const auth = firebase.auth();       //  for debugging
            await this.worldsCR.doc(iNewWorldObject.code).set(iNewWorldObject);
            return iNewWorldObject;
        } catch (msg) {
            console.log('makeNewWorld() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem making the new world: ${msg}`,
            });
        }

    },

    /**
     * We think the world code exists;
     * set up the various collection references (CR)
     * and launch the listeners
     * @param iWorldCode
     * @returns {Promise<null|*>}
     */
    joinWorld: async function (iWorldCode) {
        this.thisWorldDR = this.worldsCR.doc(iWorldCode);   //  world's document reference

        const snap = await this.thisWorldDR.get();
        if (snap.exists) {
            this.teamsCR = this.thisWorldDR.collection("teams");
            this.resultsCR = this.thisWorldDR.collection("results");
            this.figuresCR = this.thisWorldDR.collection("figures");
            this.papersCR = this.thisWorldDR.collection("papers");

            await nos2.restoreTeamsFiguresPapersResults(iWorldCode);
            this.subscribeToListeners();

            await this.thisWorldDR.set({'latest' : new Date()}, {merge : true});      //  latest join
            const theData = snap.data();

            return theData;     //  world data
        }
        return null;
    },

    subscribeToListeners: function () {
        console.log(`   *** in fireConnect.subscribeToListeners, app is ${nos2.app}`);
        fireConnect.unsubscribeFromWorld = this.setWorldListener();
        fireConnect.unsubscribeFromPapers = this.setPapersListener();
        fireConnect.unsubscribeFromFigures = this.setFiguresListener();
        fireConnect.unsubscribeFromTeams = this.setTeamsListener();
        fireConnect.unsubscribeFromResults = this.setResultsListener();

    },

    addTeam: async function (iTeam) {
        try {
            await this.teamsCR.doc(iTeam.teamCode).set(iTeam);
        } catch (msg) {
            console.log('addTeam() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem adding team [${iTeam.teamName}]: ${msg}`,
            });

        }
    },

    /**
     * Get information on the world code,
     * If it does not exist, return null
     * @param iWorldCode    the world code to be tested
     * @returns {Promise<void>}
     */
    getWorldData: async function (iWorldCode) {
        try {
            const docSnap = await this.worldsCR.doc(iWorldCode).get();
            if (docSnap.exists) {
                return docSnap.data();
            }
            return null;
        } catch (msg) {
            console.log('getWorldData() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem getting data about [${iWorldCode}]: ${msg}`,
            });

        }
    },

    getMyWorlds: async function (iGod) {
        let theWorlds = [];
        if (iGod) {
            const iterableDocSnap = await this.worldsCR.where("god", "==", iGod).get();
            iterableDocSnap.forEach((ds) => {
                theWorlds.push(ds.data())
            });
        }
        return theWorlds;
    },

    getAllTeams: async function (iWorldCode) {
        let theTeams = {};
        if (iWorldCode) {
            try {
                const iterableDocSnap = await this.teamsCR.get();
                iterableDocSnap.forEach((ds) => {
                    const aTeam = ds.data();
                    theTeams[aTeam.teamCode] = aTeam;
                });

            } catch (msg) {
                console.log('getAllTeams() error: ' + msg);
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: `Problem getting data on all the teams in [${iWorldCode}]: ${msg}`,
                });

            }
        }
        return theTeams;
    },

    /**
     * Store the userID (of the admin only?) in firestore
     * This is used to identify which worlds that person can administer
     * @param iFirebaseUser
     * @returns {Promise<void>}
     */
    setUserData: async function (iFirebaseUser) {
        try {
            const docSnap = await this.godsCR.doc(iFirebaseUser.uid).get();
            if (docSnap.exists) {
                const theUserData = docSnap.data();

            } else {
                console.log("Making a new God: " + iFirebaseUser.displayName);
                const newUserDR = await this.godsCR.doc(iFirebaseUser.uid);
                newUserDR.set({
                    name: iFirebaseUser.displayName,
                    email: iFirebaseUser.email,
                });
/*
                const newGodSnap = await newGodRef.get();
                return newGodSnap.data();
*/
            }
        } catch (msg) {
            console.log('setUserData() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem setting data for user [${iFirebaseUser.displayName}]: ${msg}.
                But for some reason things seem to work OK, so just proceed!`,
            });

        }
    },


    /*
        getFigurePreview: async function (iFigureID) {
            let out = null;
            if (iFigureID) {
                try {
                    const theFigure = nos2.theFigures[iFigureID]
                } catch (e) {
                    console.log('getFigurePreview() error: ' + e);
                }
            }
            return out;
        },
    */

    saveMessage: async function (iPaper, iWho, iText) {
        const paperDR = this.papersCR.doc(iPaper.guts.dbid);
        iPaper.guts.convo.push({
            sender: iWho,
            message: iText,
            when: Date.now(),
            subject: "paper " + iPaper.guts.text.title,
            team: iPaper.guts.teamCode,
        });

        try {
            await paperDR.update({convo: iPaper.guts.convo});
        } catch (msg) {
            console.log('saveMessage() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem saving a message about a paper: ${msg}`,
            });
            return null;
        }
    },

    /**
     * Save a result ON THE DATABASE
     * called from ... univ.doObservation()
     */
    saveResultToDB: async function (iResult) {

        //  in case this result has never been saved, get a (new) dbid.
        //  if it has been saved, we'll simply save over it.

        let resultDR = null;

        if (!iResult.dbid) {
            resultDR = this.resultsCR.doc();
            iResult.dbid = resultDR.id;
        } else {
            resultDR = this.resultsCR.doc(iResult.dbid);
        }

        const tDBID = resultDR.id;

        //  do the write
        try {
            await this.resultsCR
                .doc(tDBID)
                .withConverter(resultConverter)
                .set(iResult);
            console.log(`Saved result "${iResult.toString()}" as ${tDBID}`);

            //      and, by the way,
            await fireConnect.assertKnownResult(tDBID);

            return (iResult);       //  the entire Result
        } catch (msg) {
            console.log('saveResultToDB() error: ' + msg);

            //  todo: fix error here "TypeError: Cannot read property 'known' of undefined. "
/*
            Swal.fire({
                icon: 'error',
                title: 'oops - maybe',
                text: `Problem saving an experimental result: ${msg}. 
                    If you are acting as a journal reviewer/editor, this is probably OK. 
                     We're working on it!`,
            });
*/

            return null;
        }

    },

    /**
     * Save a paper ON THE DATABASE
     * called from nos2.userAction.savePaper
     */
    savePaperToDB: async function (iPaper) {

        //  let the system know that this team has done something
        try {
            fireConnect.teamsCR.doc(iPaper.guts.teamCode).update({
                lastChange: Date.now(),
            });
        } catch (msg) {
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem logging a team action: ${msg}`,
            });
            console.log(`Error [${msg}] logging team action in savePaperToDB`);
        }

        //  in case this paper has never been saved, get a (new) dbid.
        //  if it has been saved, we'll simply save over it.

        let paperDR;

        if (!iPaper.guts.dbid) {
            paperDR = this.papersCR.doc();
            iPaper.guts.dbid = paperDR.id;
        } else {
            paperDR = this.papersCR.doc(iPaper.guts.dbid);
        }

        const tDBID = paperDR.id;

        //  do the write
        try {
            await this.papersCR
                .doc(paperDR.id)
                .withConverter(paperConverter)
                .set(iPaper);
            console.log(`Saved paper "${iPaper.guts.title}" as ${tDBID}`);
            return (tDBID);
        } catch (msg) {
            console.log('savePaperToDB() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem saving a paper on the database: ${msg}`,
            });
            return null;
        }

    },


    /**
     * Save a Figure ON THE DATABASE
     * called from univ.userAction.saveFigure
     */
    saveFigureToDB: async function (iFigure) {

        let tDoc;       //  temp document reference

        if (iFigure.guts.dbid) {
            tDoc = this.figuresCR.doc(iFigure.guts.dbid);
        } else {
            //  get a new dbid
            tDoc = this.figuresCR.doc();
            iFigure.guts.dbid = tDoc.id;        //  put it in the object
        }

        //  do the write
        try {
            const out = await this.figuresCR
                .doc(tDoc.id)
                .withConverter(figureConverter)
                .set(iFigure);

            console.log(`Saved figure "${iFigure.guts.text.title}" as ${tDoc.id}`);
            return (tDoc.id);
        } catch (msg) {
            console.log('saveFigureToDB() error: ' + msg);
            Swal.fire({
                icon: 'error',
                title: 'oops!',
                text: `Problem saving a figure to the database: ${msg}`,
            });

            return null;
        }
    },

    deleteFigureByDBID: async function (iDBID) {
        if (iDBID) {
            const theDR = this.figuresCR.doc(iDBID);
            theDR.delete();
        }
    },

    deletePaperByDBID: async function (iDBID) {
        if (iDBID) {
            const theDR = this.papersCR.doc(iDBID);
            theDR.delete();
        }
    },

    getAllResults: async function () {
        let out = {};
        if (this.resultsCR) {
            try {
                const tResSnaps = await this.resultsCR.get();
                tResSnaps.forEach(rs => {
                    const aResult = resultConverter.fromFirestore(rs, null);
                    out[aResult.dbid] = aResult;
                });

            } catch (msg) {
                console.log("*** firestore error in getAllResults(): " + msg);
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: `Problem getting all results: ${msg}`,
                });

                return null;
            }

        } else {
            console.log("The resultsCR has not been set");
            return null;
        }
        return out;
    },

    getAllFigures: async function () {
        let out = {};
        const tFiguresSnaps = await this.figuresCR.get();    //  iterable of document snapshots

        tFiguresSnaps.forEach((figSnap) => {

            try {
                const aFigure = figureConverter.fromFirestore(figSnap, null);
                out[aFigure.guts.dbid] = aFigure;
            } catch (msg) {
                console.log("*** Error inside loop in getAllFigures(): " + msg);
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: `Problem retrieving all figures: ${msg}`,
                });

                return null;
            }
        });

        return out;
    },

    getAllPapers: async function () {
        let out = {};
        if (this.papersCR) {
            try {
                const tPapersSnaps = await this.papersCR.get();
                tPapersSnaps.forEach(ps => {
                    const aPaper = paperConverter.fromFirestore(ps, null);
                    out[aPaper.guts.dbid] = aPaper;
                });

            } catch (msg) {
                console.log("*** firestore error in getAllPapers(): " + msg);
                Swal.fire({
                    icon: 'error',
                    title: 'oops!',
                    text: `Problem retrieving all papers: ${msg}`,
                });

                return null;
            }

        } else {
            console.log("The papersCR has not been set");
            return null;
        }
        return out;
    },


    setWorldListener: function () {
        return this.thisWorldDR.onSnapshot(Ws => {
            nos2.theWorld = Ws.data();      //  update nos2.theWorld on change (e.g., epoch)
            const newYear = nos2.theWorld.epoch;

            if (newYear !== nos2.epoch) {   //  nos2.epoch was set earlier, old year number.
                nos2.epoch = nos2.theWorld.epoch;
                Swal.fire({
                    icon: 'success',
                    title: "Happy New Year!",
                    text: `It is now ${nos2.epoch} in ${nos2.state.worldCode}!`
                });
                nos2.ui.update();
            }

        })
    },

    /**
     * Sets the listener for papers
     *
     * NOTE: this does not change `nos2.currentPaper`.
     * Consequently, if you are editing a paper and a colleague is also editing it, and they save as a draft,
     * the DB will get their text and you will not hear anything about it.
     * If you then submit, your draft gets submitted.
     * If they then save again as a draft, it is no longer submitted.
     *
     * todo: make this more rational! Perhaps locking editing for papers being edited elsewhere.
     *
     * @returns {*}
     */
    setPapersListener: function () {
        return this.papersCR.onSnapshot((iPapers) => {
            nos2.thePapers = {};    //  fresh start!
            iPapers.forEach((pSnap) => {
                const aPaper = paperConverter.fromFirestore(pSnap, null);
                const dbid = aPaper.guts.dbid;
                nos2.thePapers[dbid] = aPaper;
            });
            nos2.ui.update();
            console.log(`   Listener gets ${iPapers.size} papers`);
        });
    },

    setFiguresListener: function () {
        return this.figuresCR.onSnapshot((iFigs) => {
            nos2.theFigures = {};    //  fresh start!
            iFigs.forEach((fSnap) => {
                const aFigure = figureConverter.fromFirestore(fSnap, null);
                const dbid = aFigure.guts.dbid;
                nos2.theFigures[dbid] = aFigure;
            });
            nos2.ui.update();
            console.log(`   Listener gets ${iFigs.size} figures`);
        });
    },

    setTeamsListener: function () {
        return this.teamsCR.onSnapshot((iTeams) => {
            nos2.theTeams = {};    //  fresh start!
            iTeams.forEach((tSnap) => {
                const aTeam = tSnap.data();     //  no converter for teams; just an object
                nos2.theTeams[aTeam.teamCode] = aTeam;
            });
            console.log(`   Listener gets ${iTeams.size} teams`);
            nos2.ui.update();
        });
    },

    setResultsListener: function () {
        return this.resultsCR.onSnapshot((iResults) => {
            nos2.theResults = {};    //  fresh start!
            iResults.forEach((rSnap) => {
                const aResult = resultConverter.fromFirestore(rSnap, null);
                nos2.theResults[rSnap.id] = aResult;
            });
            console.log(`   Listener gets ${iResults.size} results`);
            nos2.ui.update();
        });
    },


};