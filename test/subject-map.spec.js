'use strict';

const SubjectMap = require('../src/subject-map');

describe('A subject map', () => {

    it('can be initialized without a fault handler', () => {
        expect(() => new SubjectMap()).not.toThrow();
    });

    it('will propagate values with next()', done => {
        const map = new SubjectMap();

        map.get('foo').subscribe(value => {
            expect(value).toBe(1234);
            done();
        });

        map.next('foo', 1234);
    });

    it('will propagate errors with next()', done => {
        const map = new SubjectMap();

        const err = new Error('foo');
        map.get('foo').subscribe(null, error => {
            expect(error).toBe(err);
            done();
        });

        map.error('foo', err);
    });

    it('does not replay values if not subscribed to', done => {
        const map = new SubjectMap();

        map.next('foo', 1234);

        map.get('foo').subscribe(value => {
            expect(value).toBe(5678);
            done();
        });

        map.next('foo', 5678);
    });

    it('does not replay values if subscription was killed', done => {
        const map = new SubjectMap();

        map.get('foo').subscribe().unsubscribe();
        map.next('foo', 1234);

        map.get('foo').subscribe(value => {
            expect(value).toBe(5678);
            done();
        });

        map.next('foo', 5678);
    });

    it('emits the latest value when a new subscriber comes', done => {
        const map = new SubjectMap();

        map.get('foo').subscribe(value => {
            expect(value).toBe(1234);

            map.get('foo').subscribe(value => {
                expect(value).toBe(1234);
                done();
            });
        });
        map.next('foo', 1234);
    });

    it('keeps emitting while someone is subscribed', () => {
        const map = new SubjectMap();

        const spy1 = jasmine.createSpy('firstSubscription');
        const spy2 = jasmine.createSpy('secondSubscription');

        const firstSubscription = map.get('foo').subscribe(spy1);
        const secondSubscription = map.get('foo').subscribe(spy2);

        map.next('foo', 1);
        expect(spy1).toHaveBeenCalledWith(1);
        expect(spy2).toHaveBeenCalledWith(1);

        map.next('foo', 2);
        expect(spy1).toHaveBeenCalledWith(2);
        expect(spy2).toHaveBeenCalledWith(2);

        firstSubscription.unsubscribe();

        map.next('foo', 3);
        expect(spy1).not.toHaveBeenCalledWith(3);
        expect(spy2).toHaveBeenCalledWith(3);

        secondSubscription.unsubscribe();
    });

    it('can have a fault handler that will only be called once', done => {
        const faultHandler = jasmine.createSpy('fault handler').andReturn(new Promise((resolve, reject) => {
            setTimeout(() => resolve(1234), 500);
        }));

        const map = new SubjectMap(faultHandler);

        const observable = map.get('foo');
        expect(faultHandler).not.toHaveBeenCalled();

        observable.subscribe();

        observable.subscribe(value => {
            expect(value).toBe(1234);

            // Subscribe again
            observable.subscribe(value => {
                expect(value).toBe(1234);
                expect(faultHandler.callCount).toBe(1);
                done();
            });
        });

        expect(faultHandler.callCount).toBe(1);

        expect(faultHandler).toHaveBeenCalledWith('foo');
    });
});
