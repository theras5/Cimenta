import { expect } from 'chai';
import { getChatState, setChatState } from '../src/index';

describe('chat state', () => {
  it('Given usuario desconocido, When getChatState, Then retorna IDLE por defecto', () => {
    // Given
    const userId = 'user-default-1';
    // When
    const state = getChatState(userId);
    // Then
    expect(state).to.deep.equal({ state: 'IDLE', context: {} });
  });

  it('Given un estado seteado, When getChatState, Then devuelve ese estado y contexto', () => {
    // Given
    const userId = 'user-abc-1';
    setChatState(userId, 'AWAITING_TASK_CATEGORY', { step: 1, note: 'testing' });
    // When
    const state = getChatState(userId);
    // Then
    expect(state.state).to.equal('AWAITING_TASK_CATEGORY');
    expect(state.context).to.deep.equal({ step: 1, note: 'testing' });
  });

  it('Given un estado previo, When se setea otro, Then sobreescribe el anterior', () => {
    // Given
    const userId = 'user-abc-2';
    setChatState(userId, 'FIRST', { a: 1 });
    // When
    setChatState(userId, 'SECOND', { b: 2 });
    const state = getChatState(userId);
    // Then
    expect(state).to.deep.equal({ state: 'SECOND', context: { b: 2 } });
  });
});
