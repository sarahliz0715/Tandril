import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function CalculatorComponent() {
    const [display, setDisplay] = useState('0');
    const [currentValue, setCurrentValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const inputDigit = (digit) => {
        if (waitingForOperand) {
            setDisplay(String(digit));
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? String(digit) : display + digit);
        }
    };

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay('.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const clearDisplay = () => {
        setDisplay('0');
        setCurrentValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    };

    const performOperation = (nextOperator) => {
        const inputValue = parseFloat(display);

        if (currentValue == null) {
            setCurrentValue(inputValue);
        } else if (operator) {
            const result = calculate(currentValue, inputValue, operator);
            setCurrentValue(result);
            setDisplay(String(result));
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };

    const calculate = (firstOperand, secondOperand, operator) => {
        switch (operator) {
            case '/': return firstOperand / secondOperand;
            case '*': return firstOperand * secondOperand;
            case '+': return firstOperand + secondOperand;
            case '-': return firstOperand - secondOperand;
            case '=': return secondOperand;
            default: return secondOperand;
        }
    };
    
    const buttonClasses = "text-xl h-14 w-14 rounded-full";
    const operatorClasses = "bg-amber-500 hover:bg-amber-600 text-white";
    const functionClasses = "bg-slate-300 hover:bg-slate-400 text-slate-900";
    const digitClasses = "bg-slate-700 hover:bg-slate-600 text-white";

    return (
        <div className="bg-slate-900 p-4 rounded-lg shadow-lg">
            <div className="bg-slate-900 text-white text-5xl text-right rounded-md p-4 mb-4 break-all">
                {display}
            </div>
            <div className="grid grid-cols-4 gap-2">
                <Button onClick={clearDisplay} className={`${functionClasses} ${buttonClasses}`}>AC</Button>
                <Button className={`${functionClasses} ${buttonClasses}`}>+/-</Button>
                <Button className={`${functionClasses} ${buttonClasses}`}>%</Button>
                <Button onClick={() => performOperation('/')} className={`${operatorClasses} ${buttonClasses}`}>÷</Button>

                <Button onClick={() => inputDigit(7)} className={`${digitClasses} ${buttonClasses}`}>7</Button>
                <Button onClick={() => inputDigit(8)} className={`${digitClasses} ${buttonClasses}`}>8</Button>
                <Button onClick={() => inputDigit(9)} className={`${digitClasses} ${buttonClasses}`}>9</Button>
                <Button onClick={() => performOperation('*')} className={`${operatorClasses} ${buttonClasses}`}>×</Button>

                <Button onClick={() => inputDigit(4)} className={`${digitClasses} ${buttonClasses}`}>4</Button>
                <Button onClick={() => inputDigit(5)} className={`${digitClasses} ${buttonClasses}`}>5</Button>
                <Button onClick={() => inputDigit(6)} className={`${digitClasses} ${buttonClasses}`}>6</Button>
                <Button onClick={() => performOperation('-')} className={`${operatorClasses} ${buttonClasses}`}>−</Button>

                <Button onClick={() => inputDigit(1)} className={`${digitClasses} ${buttonClasses}`}>1</Button>
                <Button onClick={() => inputDigit(2)} className={`${digitClasses} ${buttonClasses}`}>2</Button>
                <Button onClick={() => inputDigit(3)} className={`${digitClasses} ${buttonClasses}`}>3</Button>
                <Button onClick={() => performOperation('+')} className={`${operatorClasses} ${buttonClasses}`}>+</Button>

                <Button onClick={() => inputDigit(0)} className={`${digitClasses} ${buttonClasses} col-span-2 w-auto`}>0</Button>
                <Button onClick={inputDecimal} className={`${digitClasses} ${buttonClasses}`}>.</Button>
                <Button onClick={() => performOperation('=')} className={`${operatorClasses} ${buttonClasses}`}>=</Button>
            </div>
        </div>
    );
}