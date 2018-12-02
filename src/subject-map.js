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

        let subscriptionCount = 0;

        const underlying = new Rx.ReplaySubject(1);

        subject = Rx.Observable.create(observer => {
            if (subscriptionCount++ === 0) {
                this.underlyingSubjects[key] = underlying;

                if (this.faultHandler) {
                    this.faultHandler(key)
                        .then(value => this.next(key, value))
                        .catch(error => this.error(key, error));
                }
            }

            underlying.subscribe(
                value => observer.next(value),
                error => observer.error(error),
                () => observer.complete()
            );

            return () => {
                if (--subscriptionCount <= 0) {
                    this.cleanup(key);
                }
            };
        });

        this.subjects[key] = subject;

        return subject;
    }

    cleanup(key) {
        const underlying = this.underlyingSubjects[key];
        if (underlying) {
            underlying.complete();
        }

        delete this.subjects[key];
        delete this.underlyingSubjects[key];
    }

}

module.exports = SubjectMap;
