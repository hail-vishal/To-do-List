//jshint esversion:6
require('dotenv').config();
const express = require("express");                // reduces the amount of code for node.js
const bodyParser = require("body-parser");         // used to access the data submitted through forms
const mongoose = require("mongoose");              // for mongodb
const _ = require("lodash");                       // used here capitalizing the first letter
const app = express();

// ejs -> shorthand for Embedded Javascript Templating
// used here for list.ejs file to load ads html
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true})); // sytax for using the data of forms
app.use(express.static("public")); // used for accessing the local files if deployed on a Server

mongoose.connect('mongodb+srv://' + process.env.USER_NAME + ':' + process.env.PASSWORD + '@cluster0.izphu.mongodb.net/todolistDB'); // port for mongodb connection

const itemsSchema = {
  name: String
};

const Item = mongoose.model(                          // for root route explicitly.
  "Item",  // singular name of collection
  itemsSchema  // schema of the collection
);

// for inserting defaultItems
const item1 = new Item ({
  name: "Welcome to your todo list."
});

const item2 = new Item ({
  name: "Hit + button to add a new item."
});

const item3 = new Item ({
  name: "👈 Hit this to delete an item."
});

const defaultItems = [item1, item2, item3]; // default items array


// new schema for different lists like home, work, etc.
const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("list", listSchema);


app.get("/", function(req, res) {

  // for rendering the items present in the root route
  Item.find({}, function(err, foundItems) {
    if(err) {
      console.log(err);
    } else {

      if(foundItems.length === 0){
        // inserting the default items if list is empty.
        Item.insertMany(defaultItems, function(err) {
          if(err){
            console.log(err);
          } else {
            console.log("Successfully saved the default items to the DB.");
          }
        });

        res.redirect("/"); // redirecting again to render the inserted default items.

      } else {
        res.render("list", {listTitle: "Today", newListItems: foundItems}); // passing the items to be loaded on the page through "list.ejs" in "views" folder
      }
    }
  });

});

app.get("/:customListName", function(req, res) {                      // express routing params
  const customListName = _.capitalize(req.params.customListName);     // loadash used for capitalizing

  List.findOne({name: customListName}, function(err, foundList) {
    if(!err){
      if(!foundList) {                                                // create a new list with the given name if not found
        // Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        // Show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items})   // render the list if found
      }
    }
  })



});

app.post("/", function(req, res){                   // operate on data from the form of "list.ejs".

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item ({
    name: itemName
  });


  if(listName === "Today"){                         // if  belongs to the root route.
    item.save();
    res.redirect("/");
  }
  else {
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }



});

app.post("/create", function(req, res){
  const newListName = req.body.newListName;
  res.redirect("/" + newListName);
})

app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if(listName === "Today"){
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if(!err) {
        console.log("Successfully removed!");
        res.redirect("/");
      }
    });

  } else {

    // $pull for removing an element from array of itemsSchema(items of particular other list than root route).

    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList) {
      if(!err){
        res.redirect("/" + listName);
      }
    });
  }


});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.listen(port, function() {
  console.log("Server has started Successfully.");
});
