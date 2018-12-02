'use strict';

const Rx = require('rxjs/Rx');

class SubjectMap {

    constructor(faultHandler) {
        this.faultHandler = faultHandler || null;

        this.subjects = {};
        this.underlyingSubjects = {};
    }

    next(key, value) {
        const subject = this.underlyingSubjects[key];
        if (!subject) {
            return;
        }

        subject.next(value);
    }

    error(key, error) {
        const subject = this.underlyingSubjects[key];
        if (!subject) {
            return;
        }

        subject.error(error);
    }

    get(key) {
        let subject = this.subjects[key];
        if (subject) {
            return subject; // binding already set up
        }

        console.log('setup binding for ' + key);

        let subscriptionCount = 0;

        const underlying = new Rx.ReplaySubject(1);

        subject = Rx.Observable.create(observer => {
            console.log('subscribing');

            if (subscriptionCount === 0) {
                console.log('first subscription, emit fault');
                this.underlyingSubjects[key] = underlying;

                // TODO fault handler
                if (this.faultHandler) {
                    this.faultHandler(key)
                        .then(value => this.next(key, value))
                        .catch(error => this.error(key, error));
                }
            }

            subscriptionCount++;

            underlying.subscribe(observer);

            return () => {
                subscriptionCount--;
                console.log('unsubscribing');

                if (subscriptionCount <= 0) {
                    this.cleanup(key);
                }
            };
        });

        this.subjects[key] = subject;

        return subject;
    }

    cleanup(key) {
        console.log('cleaning up: ' + key);

        delete this.subjects[key];
        delete this.underlyingSubjects[key];
    }

}

module.exports = SubjectMap;
