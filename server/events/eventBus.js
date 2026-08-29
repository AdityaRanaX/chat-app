import { EventEmitter } from "events";

class SystemEventBus extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistory = 100;
  }

  publish(eventType, payload) {
    const eventObj = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.eventHistory.unshift(eventObj);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    this.emit("event", eventObj);
    this.emit(eventType, eventObj);
    return eventObj;
  }

  getHistory() {
    return this.eventHistory;
  }
}

const eventBus = new SystemEventBus();
export default eventBus;
