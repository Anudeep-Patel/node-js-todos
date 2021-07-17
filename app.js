const datefns = require("date-fns");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
const priorityValues = ["HIGH", "MEDIUM", "LOW"];
const categoryValues = ["WORK", "HOME", "LEARNING"];

const validStatus = (request, response, next) => {
  if ("status" in request.query) {
    const { status } = request.query;
    if (statusValues.includes(status)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    next();
  }
};

const validPriority = (request, response, next) => {
  if ("priority" in request.query) {
    const { priority } = request.query;
    if (priorityValues.includes(priority)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    next();
  }
};

const validCategory = (request, response, next) => {
  if ("category" in request.query) {
    const { category } = request.query;
    if (categoryValues.includes(category)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    next();
  }
};

const validDueDate = (request, response, next) => {
  if ("date" in request.query) {
    const { date } = request.query;
    if (datefns.isMatch(date, "yyyy-MM-dd")) {
      const datef = datefns.format(new Date(`${date}`), "yyyy-MM-dd");
      request.date = datef;
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    next();
  }
};

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

app.get(
  "/todos/",
  validStatus,
  validPriority,
  validCategory,
  async (request, response) => {
    let data = null;
    let getTodosQuery = "";
    const { search_q = "", priority, status, category } = request.query;
    if ("status" in request.query && "priority" in request.query) {
      getTodosQuery = `SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%' AND status = '${status}' AND priority = '${priority}';`;
    } else if ("category" in request.query && "status" in request.query) {
      getTodosQuery = `SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%' AND category = '${category}' AND status = '${status}';`;
    } else if ("category" in request.query && "priority" in request.query) {
      getTodosQuery = `SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%' AND category = '${category}' AND priority = '${priority}';`;
    } else if ("priority" in request.query) {
      getTodosQuery = `SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%' AND priority = '${priority}';`;
    } else if ("status" in request.query) {
      getTodosQuery = `SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%' AND status = '${status}';`;
    } else if ("category" in request.query) {
      getTodosQuery = `SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%' AND category = '${category}';`;
    } else if ("search_q" in request.query) {
      getTodosQuery = `SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%';`;
    }
    data = await db.all(getTodosQuery);
    response.send(
      data.map((eachObject) => convertDbObjectToResponseObject(eachObject))
    );
  }
);

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todo));
});

app.get("/agenda/", validDueDate, async (request, response) => {
  const { date } = request.query;
  const formatDate = datefns.format(new Date(`${date}`), "yyyy-MM-dd");
  const getTodoQuery = `SELECT * FROM todo WHERE due_date = '${formatDate}';`;
  const todo = await db.all(getTodoQuery);
  response.send(
    todo.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
  );
});

app.post(
  "/todos/",
  validStatus,
  validPriority,
  validCategory,
  validDueDate,
  async (request, response) => {
    const { id, todo, category, priority, status, dueDate } = request.body;
    const postTodoQuery = `INSERT INTO todo(id, todo, category, priority, status, due_date)
      VALUES(${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');`;
    await db.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
);

app.put(
  "/todos/:todoId/",
  validStatus,
  validPriority,
  validCategory,
  validDueDate,
  async (request, response) => {
    const { todoId } = request.params;
    const requestBody = request.body;
    let updateColumn = "";
    let updateTodoQuery;
    if ("status" in request.body) {
      updateColumn = "Status";
      const { status } = request.body;
      updateTodoQuery = `
        UPDATE
        todo
        SET
        status='${status}'
        WHERE
        id = ${todoId};`;
    } else if ("priority" in request.body) {
      updateColumn = "Priority";
      const { priority } = request.body;
      updateTodoQuery = `
        UPDATE
        todo
        SET
        priority='${priority}'
        WHERE
        id = ${todoId};`;
    } else if ("todo" in request.body) {
      updateColumn = "Todo";
      const { todo } = request.body;
      updateTodoQuery = `
        UPDATE
        todo
        SET
        todo='${todo}'
        WHERE
        id = ${todoId};`;
    } else if ("category" in request.body) {
      updateColumn = "Category";
      const { category } = request.body;
      updateTodoQuery = `
        UPDATE
        todo
        SET
        category = '${category}'
        WHERE
        id = ${todoId};`;
    } else if ("dueDate" in request.body) {
      updateColumn = "Due Date";
      const { dueDate } = request.body;
      updateTodoQuery = `
        UPDATE
        todo
        SET
        due_date = '${dueDate}'
        WHERE
        id = ${todoId};`;
    }
    await db.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
);

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
