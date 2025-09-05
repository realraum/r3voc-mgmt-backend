import fs from 'node:fs';
import path from 'node:path';

import type { C3VocSchedule, Event } from '@/schedule';

const scheduleUrl =
    'https://import.c3voc.de/schedule/realraum.json?showall=yes';

const schedulePath = path.join('cache', 'schedule.json');

let cachedSchedule: C3VocSchedule | null = null;

export const fetchSchedule = async (): Promise<void> => {
    try {
        const response = await fetch(scheduleUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch schedule: ${response.statusText}`);
        }
        const data = await response.json();
        fs.mkdirSync(path.dirname(schedulePath), { recursive: true });
        fs.writeFileSync(schedulePath, JSON.stringify(data, null, 2));
        console.log('Schedule fetched and saved successfully.');
        cachedSchedule = data as C3VocSchedule;
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
};

export const getSchedule = (): C3VocSchedule | null => {
    if (cachedSchedule) {
        return cachedSchedule;
    }

    if (fs.existsSync(schedulePath)) {
        const data = fs.readFileSync(schedulePath, 'utf8');
        try {
            cachedSchedule = JSON.parse(data) as C3VocSchedule;
            return cachedSchedule;
        } catch (error) {
            console.error('Error parsing schedule JSON:', error);
            return null;
        }
    } else {
        console.warn(
            'Schedule file does not exist. Please fetch the schedule first.',
        );
        return null;
    }
};

export const getAllEvents = (): Event[] => {
    // schedule.conference.days[i].rooms.LoTHR[j]
    const scheduleData = getSchedule();
    if (!scheduleData) {
        return [];
    }

    const events: Event[] = [];

    for (const day of scheduleData.schedule.conference.days) {
        const roomNames = Object.keys(day.rooms);

        for (const roomName of roomNames) {
            const roomEvents = day.rooms[roomName];
            if (roomEvents && Array.isArray(roomEvents)) {
                events.push(...roomEvents);
            }
        }
    }

    return events;
};

export const getEventByGuid = (guid: string): Event | null => {
    const events = getAllEvents();

    return events.find(event => event.guid === guid) || null;
};
