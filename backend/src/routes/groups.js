const express = require('express');
const router = express.Router();
const Group = require('../models/Group');

router.post('/', async (req, res) => {
  const {name, memberIds} = req.body;
  const group = new Group({
    name,
    createdBy: req.user.userId,
    members: memberIds.map(id => ({userId: id, role: 'member'})),
  });
  await group.save();
  res.json({groupId: group._id});
});

router.get('/:id', async (req, res) => {
  const group = await Group.findById(req.params.id).populate('members.userId', 'name rank');
  res.json(group);
});

module.exports = router;
