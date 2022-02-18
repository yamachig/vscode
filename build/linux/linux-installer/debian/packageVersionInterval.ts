class PackageVersionIntervalEndpoint {

}

class PackageVersionInterval {

}

class PackageVersionIntervalSet {
	constructor(public readonly intervals: PackageVersionInterval[]) {

	}

	toString(): string {
		return this.intervals.map(interval => interval.toString()).join(' | ');
	}

	private intervalImpliesOtherIntervals(interval: PackageVersionInterval, otherIntervals: PackageVersionIntervalSet): boolean {
		for (const otherInterval of otherIntervals.intervals) {
			if (interval.implies(otherInterval)) {
				return true;
			}
		}
		return false;
	}

	implies(other: PackageVersionIntervalSet): boolean {
		for (const interval of this.intervals) {
			if (!this.intervalImpliesOtherIntervals(interval, other)) {
				return false;
			}
		}
		return true;
	}
}
