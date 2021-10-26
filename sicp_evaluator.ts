const MAX_RECURSION_NUMBER = 20;

function is_null(args) {
    const isNull = args == null;
    if (isNull) {
        return true;
    }
    const isValidArrayOrList = args.constructor === Array ? !!args.length : is_pair(args) && head(args) !=
        'Nil' ? true : false;
    return !isValidArrayOrList;
}

function is_pair(expr) {
    if (!!expr) {
        return !!head(expr) && !!tail(expr); // TODO: better?
    }
    return false;
}

function pair(x, y) {
    return [x, y];
}

function head(pair) {
    if (!pair) return null;
    return pair[0];
}

function tail(pair) {
    if (!pair) return null;
    return pair[1];
}

function set_head(pair, head) {
    return pair(head, pair.tail);
}

function empty() {
    return null;
}

function list(...args) {
    if (is_null(args)) {
        return empty();
    }
    const head = args[0];
    const tail = args.slice(1);
    return pair(head, list(...tail));
}

function append(list1, list2) {
    return is_null(list1) ? list2 : pair(head(list1), append(tail(list1), list2));
}

function listRef(list, n) {
    if (is_null(list)) {
        return null;
    }
    if (n <= 0) {
        return head(list);
    } else {
        return listRef(tail(list), n - 1)
    }
}

function accumulate(op, initial, sequence) {
    return is_null(sequence) ? initial : op(head(sequence), accumulate(op, initial, tail(sequence)));
}

function map(fun, items) {
    return is_null(items) ? null : pair(fun(head(items)), map(fun, tail(items)));
}

function flatmap(f, seq) {
    return accumulate(append, null, map(f, seq));
}

function _length(list) {
    return accumulate((a, b) => 1 + b, 0, list);
}

function display(list) {
    if (is_null(list)) {
        console.log('Nil')
        return;
    }
    console.log(head(list));
    display(tail(list));
}

function filter(predicate, sequence) {
    return is_null(sequence) ? null : predicate(head(sequence)) ? pair(head(sequence), filter(predicate, tail(
        sequence))) : filter(predicate, tail(sequence));
}


function error(val, string = 'Unknown error') {
    throw new Error(string + ' with the value ' + val);
}

type Component = {
    tokenType: TokenType,
    value: string
}
enum TokenType {
    Name = 'Name',
    Literal = 'Literal',
    Paren = 'Paren',
    Operator = 'Operator',
    Empty = 'Empty'
}

const LETTERS = /[a-z]/i;
const NUMBERS = /[0-9]/i; // TODO: correct number test pls; 
const SEMICOLON = /\;/i;
const OPERATORS = /[\+\-\*\/]/i; // TODO: correct number test pls; 
const isCharacter = (str: string, index: number) => !!str[index] && LETTERS.test(str[index])
const isNumber = (str: string, index: number) => !!str[index] && NUMBERS.test(str[index])
const isOperator = (str: string, index: number) => !!str[index] && OPERATORS.test(str[index])

function tokeniser(str: string): Component[] { // TODO: fix empty tokens; 
    function getNextToken(str: string, index: number): {
        component: Component,
        endIndex: number,
        isDone: boolean
    } {
        function getToken(str: string, index: number): [Component, number] {
            function getTokenEnd(str: string, index: number, predicate: (str: string, i: number) =>
                boolean): number {
                let endIndex = index;
                while (predicate(str, endIndex)) { // Nice undef check!
                    endIndex = endIndex + 1;
                }
                return endIndex;
            }

            function emptyComponent(): Component {
                return {
                    tokenType: TokenType.Empty,
                    value: ''
                };
            }
            const token = str[index];
            if (token == "(") {
                return [{
                    tokenType: TokenType.Paren,
                    value: '(',
                }, ++index];
            };
            if (token == ")") {
                return [{
                    tokenType: TokenType.Paren,
                    value: ')',
                }, ++index];
            };
            if (!!token && OPERATORS.test(token)) { // Nice undef check!
                const nameEnd = getTokenEnd(str, index, isOperator);
                return [{
                    tokenType: TokenType.Operator,
                    value: str.slice(index, nameEnd),
                }, nameEnd];
            };
            if (!!token && LETTERS.test(token)) {
                const nameEnd = getTokenEnd(str, index, isCharacter);
                return [{
                    tokenType: TokenType.Name,
                    value: str.slice(index, nameEnd),
                }, nameEnd];
            };
            if (!!token && NUMBERS.test(token)) {
                const nameEnd = getTokenEnd(str, index, isNumber);
                return [{
                    tokenType: TokenType.Literal,
                    value: str.slice(index, nameEnd),
                }, nameEnd];
            };
            return [emptyComponent(), index + 1];
        }
        const nextToken = getToken(str, index); // TODO: get rid of empty, but can I do this elegantly?
        return {
            component: nextToken[0],
            endIndex: nextToken[1],
            isDone: nextToken[1] > str.length
        };
    }

    function cycle(str: string, index: number, accum: Component[]): Component[] {
        const res: {
            component: Component,
            endIndex: number,
            isDone: boolean
        } = getNextToken(str, index)
        if (res.component.tokenType !== TokenType.Empty) {
            accum.push(res.component)
        }
        return res.isDone ? accum : cycle(str, res.endIndex, accum);
    }
    return cycle(str, 0, []);
}

function make_binary_application(operator, firstOperand, secondOperand) {
    const res = list('binary_operator_combination', operator, firstOperand, secondOperand);
    return res;
}

function make_primitive_function(value, params) {
    return list('primitive', value, params);
}

function make_literal(value) {
    return list("literal", +value);
}

function make_name(symbol) {
    return list("name", symbol);
}
function make_lambda_expression(parameters, body) {
    console.log('make_lambda_expression with params: ' + JSON.stringify(parameters) + ' and body ' + JSON.stringify(body));
    const res = list("lambda_expression", parameters, body);
    return res;
}
function make_constant_declaration(name, value_expression) {
    return list("constant_declaration", make_name(name), value_expression);
}
function make_function_declaration(name, params, returnStatement){
    return list("function_declaration", make_name(name), params, make_return_statement(returnStatement));
}


function make_return_statement(expr) {
    return list("return_statement", expr);
}

type WalkResult = {
    node: any, current: number
}

type WalkBlockResult = {
    nodes: any, current: number
}


function parser(tokens: Component[]): any {
    const componentFactory = {
        makeName : (current: number, tokens: any) => {
            console.log('componentFactory - Make Name');
            const token = tokens[current];
            return {
                node : make_name(token.value),
                current: current + 1,  // TODO: is it clean? 
            }
        },
        makeOperator: (current: number, tokens: any) => {
            console.log('componentFactory - Operator Application');
            const token = tokens[current];
            current++;
            const blockResult = walkBlock(current);
            const listOfOperands = blockResult.nodes;
            current = blockResult.current;
            console.log('List Of Operands ' + JSON.stringify(listOfOperands) + ' and current ' + current + ' ' + JSON.stringify(tokens[current]));
            const binary_application = make_binary_application(token.value,
                head(listOfOperands),
                tail(listOfOperands));
            return {
                node: binary_application,
                current: current, // TODO: is it clean? 
            };
        },
        makeDefinition: (current : number, tokens: any) => {
                 console.log('componentFactory - Definition Statement');
                        const nextToken = tokens[current + 1];
                        if(nextToken.tokenType === TokenType.Paren && nextToken.value === '('){
                            return componentFactory.makeFunction(current, tokens);
                        }
                        current++;
                        const name = tokens[current].value;
                        current++;
                        const value = walk(current);
                        current = value.current;
                        const res = make_constant_declaration(name, value.node);
                        return { node: res, current: current + 1}
        } ,
        makeFunction: (current : number, tokens: any) => {
                 console.log('componentFactory - Function Statement');
                        current = current + 2;
                        console.log('getting function name, current ' + current)
                        const functionName = tokens[current].value;
                        current++;
                        console.log('walking function parameters, current ' + current)
                        const functionParams = walkBlock(current);
                        current = functionParams.current;
                        console.log('returned function parameters ' + JSON.stringify(functionParams.nodes))
                        const returnStatement = walk(current);
                        const res = make_function_declaration(functionName, list(functionParams.nodes), returnStatement.node); // TODO: nodes may not require list if many args
                        return { node: res, current: returnStatement.current  + 1} 
        } ,
        makeExpression : (current : number, tokens : any) => {
             console.log('componentFactory - Expression');
             const expressionName = componentFactory.makeName(current, tokens);
             const expressionArgs = walkBlock(expressionName.current).nodes;
             const res = make_application(expressionName.node, expressionArgs);
             return { node: res, current: expressionArgs.current + 1};
        }
    }
    function walk(curr: number): WalkResult {
        let current = curr;
        console.log("walking: token " + current + " of " + tokens.length + " value " + JSON.stringify(tokens[curr]));
        if (current > tokens.length) {
            return {
                node: empty(),
                current
            };
        }
        let token = tokens[current];
        if (token.tokenType === TokenType.Literal) {
            console.log('Appending Number');
            return {
                node: make_literal(token.value),
                current: current + 1
            };
        }
        if (token.tokenType === TokenType.Name) {
            return componentFactory.makeName(current, tokens);
        }
        if (token.tokenType === TokenType.Paren && token.value === '(') {
            token = tokens[++current];
            switch (token.tokenType) {
                case TokenType.Operator: return componentFactory.makeOperator(current, tokens);
                case TokenType.Name: {
                    if (token.value === 'define') {
                       return  componentFactory.makeDefinition(current, tokens);
                    }
                    return componentFactory.makeExpression(current, tokens);

                }
                default : {
                    throw new Error('Unknown token Type ' + JSON.stringify(token));
                }
            }
        }
        if (token.tokenType === TokenType.Paren && token.value === ')') {
            console.log('Walk - end parenthesis')
            current++;
            return {
                node: empty(),
                current
            };
        }
        throw new TypeError('Walk -  Wrong Token Type ' + token.tokenType);
    }

    function walkBlock(curr): WalkBlockResult {
        let current = curr;
        let token = tokens[current];
        let params;
        let counter = 0;
        while ((token.tokenType !== TokenType.Paren || (token.tokenType === TokenType.Paren && token.value !== ')'))) {
            console.log('walkBlock cycle' + JSON.stringify(token) + ' current ' + current);
            const cycleResult: WalkResult = walk(current);
            const node = cycleResult.node;
              if (!params) {
                  console.log('walkBlock - starting with ' + JSON.stringify(cycleResult.node))
                  params = node
              } else {
                  console.log('walkBlock - appending ' + JSON.stringify(cycleResult.node) + ' to ' + JSON.stringify(params))
                  params = pair(params, node);
              }

            console.log('WalkBlock - next token ' + cycleResult.current + ' ' + JSON.stringify(tokens[cycleResult.current]));
            token = tokens[cycleResult.current];
            current = cycleResult.current;
            if (token.tokenType === TokenType.Paren && token.value === ')') {
                console.log('Walk Block - closing parenthesis, returning ' + JSON.stringify(params))
                return { nodes: params, current: cycleResult.current + 1 }; // +1 // TODO: why +1? Whose contract is this? Where are the tests? 
            }
            counter++;
            if (counter > MAX_RECURSION_NUMBER) {
                throw new Error('Infinite recursion in walkBlock');
            }
        }
        console.log('Walk Block - returning params ' + JSON.stringify(params))
        return { nodes: params, current : current + 1};
    }

    let counter = 0;
    function walkLoop(ast) {

        function make_sequence(nodes : any, node : any){
            return list('sequence', pair(nodes, pair(node, null)));
        }
        let current = 0;
        do {
            console.log('driver loop ' + JSON.stringify(ast)); // This is fail-fast; if my walk() needs this, I've got a mistake in program;
            const res = walk(current);
            current = res.current; // NICE ORDER!
            console.log('drive loop next res ' + JSON.stringify(res) + ' current ' + current + ' tok ' + JSON.stringify(tokens[current]));
            if(!is_null(ast)){
                ast = make_sequence(ast, res.node);
            } else {
                ast = res.node; 
            }
            counter++;
            if (counter > MAX_RECURSION_NUMBER) {
                throw new Error('Infinite recursion in walkLoop');
            }
        } while (current < tokens.length);
        return ast;
    }
    const res = walkLoop(empty());
    console.log('=====RETURNING AST===== ' + JSON.stringify(res));
    return res;
}

function evaluate(
    component, env) {
    console.log('evaluate ' + JSON.stringify(component) + ' ' + component);
    let res;
    if(is_literal(component)){
        res = literal_value(component);
           console.log('evaluated ' + JSON.stringify(component) + ' with result ' + JSON.stringify(res));
        return res;
    }
    if(is_name(component)){
        res = lookup_symbol_value(symbol_of_name(component), env);
           console.log('evaluated ' + JSON.stringify(component) + ' with result ' + JSON.stringify(res));
        return res;
    }
    if(is_application(component)){
        const fun = evaluate(function_expression(
            component), env);
             console.log('starting evaluating application ' + JSON.stringify(component) + ' its function ' + JSON.stringify(fun));
        const args = list_of_values(arg_expressions(component), env);
           console.log('evaluated ' + JSON.stringify(component) + ' applying ' + fun + JSON.stringify(args));
        return apply(fun, args);
    }
    if(is_declaration(component)){
        console.log('evaluatring declaration ' + JSON.stringify(component) + ' with env ' + JSON.stringify(env));
        const newEnv = eval_declaration(component, env);
        console.log('evaluated constant declaration with new env ' + JSON.stringify(newEnv));
        return newEnv;
    }
    if(is_sequence(component)){
        console.log('evaluatring sequence ' + JSON.stringify(component) + ' with env ' + JSON.stringify(env));
        return eval_sequence(sequence_statements(component), env);
    }
    res = is_operator_combination(
            component) ? evaluate(operator_combination_to_application(component), env) : is_conditional(
            component) ? eval_conditional(component, env) : is_lambda_expression(component) ? make_function(
            lambda_parameter_symbols(component), lambda_body(component), env) : is_block(component) ? eval_block(component,
        env) : is_return_statement(component) ? eval_return_statement(component, env) :
        is_function_declaration(component) ? evaluate(function_decl_to_constant_decl(component), env) :
        is_assignment(component) ? eval_assignment(component, env) : error(JSON.stringify(component), "unknown syntax -- evaluate");
    console.log('evaluated ' + JSON.stringify(component) + ' with result ' + JSON.stringify(res) + ' ' + res);
    //  is_literal(component) ? literal_value(component) : is_name(component) ? lookup_symbol_value(
    //         symbol_of_name(component), env) : is_application(component) ? apply(evaluate(function_expression(
    //         component), env), list_of_values(arg_expressions(component), env)) :
    return res;
}

function apply(fun, args) {
    console.log('applying ' + JSON.stringify(fun) + ' ____ to ' + JSON.stringify(args))
    if (is_primitive_function(fun)) {
        return apply_primitive_function(head(tail(fun)), args);
    } else if (is_compound_function(fun)) {
        const result = evaluate(function_body(fun), extend_environment(function_parameters(fun), args,
            function_environment(fun)));
        return is_return_value(result) ? return_value_content(result) : undefined;
    } else {
        error(fun, "unknown function type -- apply");
    }
}

function list_of_values(exps, env) {
    return map(arg => evaluate(arg, env), exps);
}

function eval_conditional(component, env) {
    return is_truthy(evaluate(conditional_predicate(component), env)) ? evaluate(conditional_consequent(
        component), env) : evaluate(conditional_alternative(component), env);
}

function eval_sequence(stmts, env) {
    console.log('eval_sequence ' + JSON.stringify(stmts) + ' with env ' + JSON.stringify(env));
    if (is_empty_sequence(stmts)) {
        return undefined;
    } else if (is_last_statement(stmts)) {
        return evaluate(first_statement(stmts), env);
    } else {
        const first_stmt_value = evaluate(first_statement(stmts), env);
        if (is_return_value(first_stmt_value)) {
            return first_stmt_value;
        } else {
            return eval_sequence(rest_statements(stmts), first_stmt_value);
        }
    }
}

function list_of_unassigned(symbols) {
    return map(symbol => "*unassigned*", symbols);
}

function scan_out_declarations(component) {
    return is_sequence(component) ? accumulate(append, null, map(scan_out_declarations, sequence_statements(
        component))) : is_declaration(component) ? list(declaration_symbol(component)) : null;
}

function eval_block(component, env) {
    const body = block_body(component);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return evaluate(body, extend_environment(locals, unassigneds, env));
}

function eval_return_statement(component, env) {
    return make_return_value(evaluate(return_expression(component), env));
}

function eval_assignment(component, env) {
    const value = evaluate(assignment_value_expression(component), env);
    assign_symbol_value(assignment_symbol(component), value, env);
    return value;
}

function eval_declaration(component, env) {
    console.log(JSON.stringify('assign_symbol_value ' + JSON.stringify(declaration_symbol(component))));
    const declarationExpr = tail(head(declaration_value_expression(component))); // TODO: what if it's a list? Test on functions with 2 parameters
    console.log(JSON.stringify('and evaluate declaration value expression ' + JSON.stringify(declarationExpr)));
   
    const res = assign_symbol_value(declaration_symbol(component),
     make_function(declarationExpr, 
                                return_value_expression(component), env), 
        env);
    return res;
}
                                          
// functions from SICP JS 4.1.2
function is_tagged_list(component, the_tag) {
    const res = is_pair(component) && head(component) === the_tag;
    return res;
}

function is_literal(component) {
    return is_tagged_list(component, "literal");
}

function literal_value(component) {
    return head(tail(component));
}

function is_name(component) {
    return is_tagged_list(component, "name");
}

function symbol_of_name(component) {
    console.log('symbol of name ' + JSON.stringify(component))
    return head(tail(component));
}

function is_assignment(component) {
    return is_tagged_list(component, "assignment");
}

function assignment_symbol(component) {
    return head(tail(head(tail(component))));
}

function assignment_value_expression(component) {
    return head(tail(tail(component)));
}

function is_declaration(component) {
    return is_tagged_list(component, "constant_declaration") || is_tagged_list(component,
        "variable_declaration") || is_tagged_list(component, "function_declaration");
}

function declaration_symbol(component) {
    console.log('declaration symbol ' + JSON.stringify(component));
    return symbol_of_name(head(tail(component)));
}

function declaration_value_expression(component) {
    console.log('getting declaration_value_expression ' + JSON.stringify(component))
    return head(tail(tail(component)));
}

function return_value_expression(component){ // TODO: really?
    return head(tail(tail(tail(component))));
}

function is_lambda_expression(component) {
    return is_tagged_list(component, "lambda_expression");
}

function lambda_parameter_symbols(component) {
    return map(symbol_of_name, head(tail(component)));
}

function lambda_body(component) {
    return head(tail(tail(component)));
}

function is_function_declaration(component) {
    return is_tagged_list(component, "function_declaration");
}

function function_declaration_name(component) {
    return listRef(component, 1);
}

function function_declaration_parameters(component) {
    return listRef(component, 2);
}

function function_declaration_body(component) {
    return listRef(component, 3);
}

function function_decl_to_constant_decl(component) {
    return make_constant_declaration(function_declaration_name(component), make_lambda_expression(
        function_declaration_parameters(component), function_declaration_body(component)));
}

function is_return_statement(component) {
    return is_tagged_list(component, "return_statement");
}

function return_expression(component) {
    return head(tail(component));
}

function is_conditional(component) {
    return is_tagged_list(component, "conditional_expression") || is_tagged_list(component,
        "conditional_statement");
}

function conditional_predicate(component) {
    return listRef(component, 1);
}

function conditional_consequent(component) {
    return listRef(component, 2);
}

function conditional_alternative(component) {
    return listRef(component, 3);
}

function is_sequence(stmt) {
    return is_tagged_list(stmt, "sequence");
}

function sequence_statements(stmt) {
    return head(tail(stmt));
}

function first_statement(stmts) {
    return head(stmts);
}

function rest_statements(stmts) {
    return tail(stmts);
}

function is_empty_sequence(stmts) {
    return is_null(stmts);
}

function is_last_statement(stmts) {
    return is_null(tail(stmts));
}

function is_block(component) {
    return is_tagged_list(component, "block");
}

function block_body(component) {
    return head(tail(component));
}

function make_block(statement) {
    return list("block", statement);
}

function is_operator_combination(component) {
    const res = is_unary_operator_combination(component) || is_binary_operator_combination(component); 
    return res;
}

function is_unary_operator_combination(component) {
    return is_tagged_list(component, "unary_operator_combination");
}

function is_binary_operator_combination(component) {
    return is_tagged_list(component, "binary_operator_combination");
}

function operator_symbol(component) {
    return listRef(component, 1);
}

function first_operand(component) {
    return listRef(component, 2);
}

function second_operand(component) {
    return listRef(component, 3);
}

function make_application(function_expression, argument_expressions) {
    function listify(args){
      if(is_null(listRef(args, 1))){
         return list(args);
      } else {
         return args;
      }
    }
    console.log('make_application', JSON.stringify(function_expression) + '  to ' + JSON.stringify(argument_expressions));
    const res =  list("application", function_expression, listify(argument_expressions));
    return res;
}

function operator_combination_to_application(component) {
    const operator = operator_symbol(component);
    console.log('operator_combination_args ' + JSON.stringify(component));
    const res = is_unary_operator_combination(component) ? make_application(make_name(operator), list(
        first_operand(component))) : make_application(make_name(operator), list(first_operand(component),
        second_operand(component)));
    console.log('operator_combination_to_application ' + JSON.stringify(res));
    return res;
}

function is_application(component) {
    return is_tagged_list(component, "application");
}

function function_expression(component) {
    return head(tail(component));
}

function arg_expressions(component) {
    console.log('getting arg expressions ' + JSON.stringify(component))
    return head(tail(tail(component))); // TODO: application of defined function needs one extra tail here. debug; 
}

function is_truthy(x) {
    return is_boolean(x) ? x : error(x, "boolean expected, received");
}

function is_boolean(x) {
    return is_tagged_list(x, "boolean"); // TODO: unknown type x
}

function is_falsy(x) {
    return !is_truthy(x);
}

function make_function(parameters, body, env) {
    return list("compound_function", parameters, body, env);
}

function is_compound_function(f) {
    return is_tagged_list(f, "compound_function");
}

function function_parameters(f) {
    return listRef(f, 1);
}

function function_body(f) {
    return listRef(f, 2);
}

function function_environment(f) {
    return listRef(f, 3);
}

function make_return_value(content) {
    return list("return_value", content);
}

function is_return_value(value) {
    return is_tagged_list(value, "return_value");
}

function return_value_content(value) {
    return head(tail(value));
}

function enclosing_environment(env) {
    return tail(env);
}

function first_frame(env) {
    return head(env);
}
const the_empty_environment = empty();

function make_frame(symbols, values) {
    return pair(symbols, values);
}

function frame_symbols(frame) {
    return head(frame);
}

function frame_values(frame) {
    return tail(frame);
}

function stringify(s){
    return JSON.stringify(s);
}

function extend_environment(symbols, vals, base_env) {
    console.log('extend_environment ' + JSON.stringify(symbols) + ' ' + JSON.stringify(vals) + ' ' + base_env);
    return _length(symbols) === _length(vals) ? pair(make_frame(symbols, vals), base_env) : _length(symbols) <
        _length(vals) ? error("too many arguments supplied: " + stringify(symbols) + ", " + stringify(vals)) :
        error("too few arguments supplied: " + stringify(symbols) + ", " + stringify(vals));
}

function lookup_symbol_value(symbol, env) {
    console.log('lookup_symbol_value ' + symbol + ' in env' +  JSON.stringify(env));
    function env_loop(env) {
        function scan(symbols, vals) {
            console.log('lookup scan - symbols null ? ' + is_null(symbols) + ' ' + JSON.stringify(symbols));
            return is_null(symbols) ? env_loop(enclosing_environment(env)) : symbol === head(symbols) ? head(
                vals) : scan(tail(symbols), tail(vals));
        }
        if (env === the_empty_environment) {
            error(symbol, "lookup - unbound name");
        } else {
            const frame = first_frame(env);
            console.log('lookup symbol first frame ' + JSON.stringify(frame)); 
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    const res = env_loop(env);
    console.log('lookup for ' + symbol + ' is ' + res);
    return res;
}

function assign_symbol_value(symbol, val, base_Env) {
    console.log('assign_symbol_value ' + symbol + ' to value ' + val + ' in env' +  JSON.stringify(base_Env));
    function env_loop(env) {
        function scan(symbols, vals) {
            if(is_null(symbols)){
                console.log('next env loop')
                return env_loop(enclosing_environment(env));
            }
            if(symbol === head(symbols)){
                console.log('env loop - settinhnh head of ' + vals + ' to ' + val); 
                set_head(vals, val)
            }
            console.log('next scan');
            return scan(tail(symbols), tail(vals));
        }
        if (env === the_empty_environment) {
            console.log('Extending environment ');
            const extended = extend_environment(pair(symbol, null), pair(val, null), base_Env) 
            return extended;
        } else {
            const frame = first_frame(env);
            console.log('scanning environment for the name ' + JSON.stringify(frame_symbols(frame))  + 
              + '  ' +JSON.stringify(frame_values(frame)));
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    return env_loop(base_Env);
}
// functions from SICP JS 4.1.4
function is_primitive_function(fun) {
    return is_tagged_list(fun, "primitive");
}

function primitive_implementation(fun) {
    return head(tail(fun));
}
const primitive_functions = list(list("head", head), list("tail", tail), list("pair", pair), list("list",
    list), list("is_null", is_null), list("display", display), list("error", error), list("math_abs",
    Math.abs), list("+", (x, y) => x + y), list("-", (x, y) =>  x - y), list("-unary", x => -x), list(
    "*", (x, y) => x * y), list("/", (x, y) => x / y), list("%", (x, y) => x % y), list("===", (x,
    y) => x === y), list("!==", (x, y) => x !== y), list("<", (x, y) => x < y), list("<=", (x, y) =>
    x <= y), list(">", (x, y) => x > y), list(">=", (x, y) => x >= y), list("!", x => !x));
const primitive_function_symbols = map(head, primitive_functions);
const primitive_function_objects = map(fun => list("primitive", head(tail(fun))), primitive_functions);
const primitive_constants = list(list("undefined", undefined), list("Infinity", Infinity), list("math_PI",
    Math.PI), list("math_E", Math.E), list("NaN", NaN));
const primitive_constant_symbols = map(c => head(c), primitive_constants);
const primitive_constant_values = map(c => head(tail(c)), primitive_constants);

function apply_primitive_function(fun, arglist) {
    const args = toArray(arglist);
    console.log('apply_primitive_function ' + fun + '  ' + args);
    const res = fun(...args);
    return res;
}

// TODO: finish;
function toArray(list){
    let i = 0
    let res = [head(list)];
    let temp = tail(list);
    while(true){
        res.push(head(temp));
        temp = tail(temp);
        i++;
        if(!is_pair(tail(temp))) break;
        if(i > 10) break; 
    }
    return res; 
}

function setup_environment() {
    return extend_environment(append(primitive_function_symbols, primitive_constant_symbols), append(
        primitive_function_objects, primitive_constant_values), the_empty_environment);
}
let the_global_environment = setup_environment();

const tok = tokeniser('(define (square x)(* x x)); (square 4);') // 16
const tokIndexed = tok.map((token, index) => {return Object.assign({}, token, {index : index})});
console.log(tokIndexed);
const parsed = parser(tok);
console.log(parsed);

const evaluated = evaluate(parsed, the_global_environment);
console.log(evaluated); // 16 
